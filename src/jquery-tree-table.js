/**
 * A JQuery Widget plugin for displaying tables with one column being a tree.
 *
 * License: https://github.com/mbools/jquery-tree-table/blob/master/LICENSE
 *
 * Documentation: https://github.com/mbools/jquery-tree-table/wiki
 *
 */

(function ($) {
    "use strict";

    const ATTR = {
        // Table attributes...
        active: 'data-jtt-active',
        insertOrder: 'data-jtt-insert-order',
        forceTreeConstraints: 'data-jtt-force-tree-constraints',
        indent: 'data-jtt-indent',
        showLines: 'data-jtt-draw-lines',
        nodeOpenGlyph: 'data-jtt-open-glyph',
        nodeClosedGlyph: 'data-jtt-closed-glyph',

        // Column attributes...
        sort: 'data-jtt-sort',
        sortOrder: 'data-jtt-sort-order',
        sortType: 'data-jtt-sort-type',
        tree: 'data-jtt-tree',

        // Row attributes...
        id: 'data-jtt-id',
        parent: 'data-jtt-parent',
        fixedParent: 'data-jtt-fixed-parent',
        limitParent: 'data-jtt-limit-parent',
    };

    const DEFAULT = {
        SORT_ORDER: 'asc',
        SORT_TYPE: 'alpha',
        OPENGLYPH: 'jtt-open',      // Class(es) for inclusion of open node glyph
        CLOSEDGLYPH: 'jtt-closed',  // Class(es) for inclusion of closed node glyph
        INDENT: 15,                 // Default indentation on each tree level, in px
    };

    $(document).ready(function () {
        $('table.treetable').treetable();
    });

    $.widget("mbools.treetable", {

        // Default options...
        options: {
            active: false,  // Whether to use DOM observer
            insertOrder: false, // Whether to treat undecorate rows according to their position
            forceTreeConstraints: false, // Whether to impose tree contrainsts even if no jtt-tree column specified
            showLines: true,    // Whether to draw connecting lines on tree
            nodeOpenGlyph: DEFAULT.OPENGLYPH,
            nodeClosedGlyph: DEFAULT.CLOSEDGLYPH,
            indent: DEFAULT.INDENT,
            console: {
                errors: false,    // Whether to log error messages to the console
                debug: true,   // Whether to log debug messages to the console
            },
        },

        _columnSettings: [],

        // Widget constructor...
        _create() {
            if (!this.element.hasClass("treetable")) {
                this.element.addClass("treetable");
            }
            if (this.element.attr(ATTR.active) !== undefined) {
                this._active(true);
            }

            this._update();
        },


        ///////////////// API

        //// Table level attru=ibute controls

        active(state) {
            if (state !== undefined) {
                this._active(state);
            }
            return this.options.active;
        },

        forceTreeConstraints(state) {
            if (state !== undefined) {
                this._forceTreeConstraints(state);
            }
            return this.options.forceTreeConstraints = state;
        },

        showLines(state, immediate) {
            if (state !== undefined) {
                this.options.showLines = state;
                if (this.element.attr(ATTR.showLines) && !state) {
                    this.element.removeAttr(ATTR.showLines);
                }
                else {
                    this.element.attr(ATTR.showLines, "");
                }
                if (immediate && !this.options.active) this._redecorate();
            }
            return this.options.showLines;
        },


        indent(indent, immediate) {
            this.options.indent = indent;
            this.element.attr(ATTR.indent, indent);
            if (immediate && !this.options.active) this._redecorate();
        },

        nodeOpenGlyph(classes, immediate) {
            this.options.nodeOpenGlyph = classes;
            this.element.attr(ATTR.nodeOpenGlyph, classes);
            if (immediate && !this.options.active) this._redecorate();
        },


        nodeClosedGlyph(classes, immediate) {
            this.options.nodeClosedGlyph = classes;
            this.element.attr(ATTR.nodeClosedGlyph, classes);
            if (immediate && !this.options.active) this._redecorate();
        },

        redecorate() {
            this._redecorate();
        },

        update() {
            this._update();
        },


        _toggleAttr(attr, state) {
            let newState = state || !this.element.attr(attr);
            if (newState) {
                this.element.attr(attr, "");
            }
            else {
                this.element.removeAttr(attr);
            }
        },


        _active(state) {
            let self = this;
            this._observers = this._observers || {};
            if (state) {
                if (self._observers.tbody === undefined) {
                    self._observers.tbody = new MutationObserver(function (mutations) {
                        // Crude implementation. May require improvement if performance becomes an issue
                        self._update();
                    });
                }
                if (self._observers.thead === undefined) {
                    self._observers.thead = new MutationObserver(function (mutations) {
                        // Crude implementation. May require improvement if performance becomes an issue
                        self._update();
                    });
                }
                //let head = this.element.find('thead');
                //let headel = head.get();
                //let body = this.element.find('tbody');
                //let bodyel = body.get();
                self.element.find('thead td, thead th').each(function () {
                    self._observers.thead.observe(this, {attributes: true});
                });
                self._bodyObserver(true);
            }
            else {
                self._bodyObserver(false);
                if (self._observers.thead !== undefined) {
                    self._observers.thead.disconnect();
                }
            }
            self.options.active = state;
        },

        _bodyObserver(state) {
            if (state) {
                let result = this._observers.tbody.observe(this.element.find('tbody').get()[0], {childList: true, subtree: true, attributes: true});
                console.log("OBSERVER ON: " + result);
            }
            else {
                if (this._observers.tbody !== undefined) {
                    this._observers.tbody.disconnect();
                    console.log("OBSERVER OFF");
                }
            }
        },

        _setOption(key, value) {
            // Validate...
            this.options[key] = value; // Set
            if (this.element.data[key] !== value) {
                this.element.data[key] = value;
            }
            //Act...
        },

        // General update of widget...
        _update() {
            this._bodyObserver(false);  // Suspend while we mess with the tbody

            this._updateOptions();
            this._updateColSettings();
            this._buildTree();

            this._sort();

            this._reflowTable();

            this._redecorate();

            if (this.options.active) {
                this._bodyObserver(true);
            }

        },

        _shiftErrorsToEnd() {
            let errors = $('.jtt-error');
            errors.remove().appendTo(this.element);
        },

        _updateOptions() {
            this.options.active = this.options.active || this.element.attr(ATTR.active);
            this.options.indent = this.options.indent || this.element.attr(ATTR.indent);
            this.options.insertOrder = this.options.insertOrder || this.element.attr(ATTR.insertOrder);
            this.options.forceTreeConstraints = this.options.forceTreeConstraints || this.element.attr(ATTR.forceTreeConstraints);
        },


        _updateColSettings() {
            let self = this;
            $(self.element.find('thead tr').get().reverse()).each((rowi, rowe) => {
                let $row = $(rowe);
                let coli = 1;
                $row.find('th,td').each((item, element) => {
                    let $colc = $(element);
                    let colw = +$colc.attr('colspan') || 1;
                    let colset = {
                        tree: $colc.attr(ATTR.tree),
                        sort: $colc.attr(ATTR.sort),
                        sortOrder: $colc.attr(ATTR.sortOrder),
                        sortType: $colc.attr(ATTR.sortType),
                    };
                    for (let i = 0; i < colw; i++) {
                        if (rowi === 0) {
                            self._columnSettings[coli + i] = colset;
                        }
                        else {
                            for (let p in colset) {
                                if (self._columnSettings[coli + i][p] === undefined) {
                                    self._columnSettings[coli + i][p] = colset[p];
                                }
                            }
                        }
                    }
                    coli += colw;
                });
            });
            console.log(this._columnSettings);
        },


        _treeColumn() {
            return this._columnSettings.findIndex((colset) => colset && colset.tree !== undefined) + 1;
        },

        /**
         * Force jtt-parent to match any jtt-fixed-parent
         * @private
         */
        _fixupParents() {
            this.element.find('tbody tr[data-jtt-fixed-parent]').attr('data-jtt-parent', function () {
                return this.getAttribute('data-jtt-fixed-parent')
            });
        },

        /**
         * Create the internal tree structure
         * @private
         */
        _buildTree(){
            let self = this;
            let nodes = {'/': {id: '/', children: []}};
            this._fixupParents();

            this._tree = {};

            self.element.find('tbody tr').each((rowi, rowe) => {
                let $row = $(rowe);
                let rowid = $row.data('jtt-id');
                if (rowid && nodes[rowid]) {
                    if (self.options.console.errors) console.log(`jquery-tree-table: Duplicate jtt-id (${rowid}) in table at row ${rowi}. Ignored.`);
                    $row.addClass('jtt-error');
                }
                else {
                    let parent = $row.attr(ATTR.fixedParent) || $row.attr(ATTR.parent);
                    if (!parent) {
                        let $lastParentedNode = $row.prevAll('[' + ATTR.parent + ']').last();
                        if ($lastParentedNode.length) {
                            parent = $lastParentedNode.attr(ATTR.parent);
                        }
                        else {
                            parent = '/';
                        }
                    }

                    if (parent === rowid) {
                        if (self.options.console.errors) console.log(`jQuery-tree-table: ${rowid} defined with itself as parent. Ignored, setting parent to root`);
                        parent = '/';
                        // TODO This should really detect any circular definitions and break them
                    }

                    if (!rowid) {
                        rowid = self._guid();
                        $row.attr(ATTR.id, rowid);
                    }

                    nodes[rowid] = {
                        id: rowid,
                        parent: parent,
                        $row: $row,
                        children: [],
                        open: true,
                    };
                }
            });

            self._tree = nodes['/'];
            delete nodes['/'];

            for (let node in nodes) {
                if (nodes[node].parent !== '/') {
                    nodes[nodes[node].parent].children.push(nodes[node]);
                }
                else {
                    self._tree.children.push(nodes[node]);
                }
            }
        },


        // Kudos broofa http://stackoverflow.com/a/2117523
        _guid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },


        // Attempt to organise the table rows such that they will render consistent with constraints
        _reflowTable() {
            // Since we have no idea how large this table might be, let's work outside the DOM...
//            let parent = this.element.parent();
//            let table = this.element.detach();

            if (!(this.options.forceTreeConstraints || this._treeColumn())) {  // There's no tree column, and no force in place, so the constraints don't matter
                return;
            }

            this._treeWalk(this._tree, (node) => {
                node.$row.detach();
                this.element.append(node.$row);
            });


            this._shiftErrorsToEnd();

            // Replace in the DOM...
//            parent.element.append(table);
        },

        /**
         * Simply depth first tree walker
         * @param node
         * @param cb
         * @param depth
         * @private
         */
        _treeWalk(node, cb, depth = 0) {
            let continuation = true;
            if (node.$row) {
                continuation = cb(node, depth);
                continuation = (continuation !== undefined && typeof continuation === 'boolean') ? continuation : true;
            }

            if (continuation) {
                let numChildren = node.children.length;
                for (let i = 0; i < numChildren; i++) {
                    this._treeWalk(node.children[i], cb, depth + 1);
                }
            }
        },

        // Decorate the table consistent with settings
        _redecorate() {
            let self = this;
            let indent = this.options.indent;
            let treeCol = this._treeColumn();

            let currentTNode = this._tree.children[0].$row.children('td.jtt-tree-node').index();
            if (self.options.console.debug) console.log(`currentTNode is ${currentTNode} treeCol (with offset) is ${treeCol - 2}`)
            if (currentTNode >= 0 && currentTNode !== treeCol - 2) {
                // Tree has moved columns, been removed, or is not specified, so wipe out any old tree decoration
                let currNodes = this.element.find('.jtt-tree-node');
                currNodes.find('.jtt-node-offset').remove();
                currNodes.find('.jtt-entry').contents().unwrap();
                currNodes.removeClass('jtt-tree-node');
            }

            if (treeCol === 0) return; // No tree to decorate

            this._treeWalk(this._tree, (node, depth) => {
                let col = node.$row.children('td.jtt-tree-node');
                if (col.length === 0) { // Decorate for the first time...
                    // TODO This currently assumes all columns in a row have no colspan!
                    let connector = $(`<div class="jtt-node-offset" style="margin-left: ${depth * indent}px"><div class="jtt-connector"></div></div>`);

                    col = node.$row.children(`td:nth-of-type(${treeCol - 1})`)
                        .addClass('jtt-tree-node')
                        .wrapInner('<div class="jtt-entry"></div>')
                        .prepend(connector);

                    let control = $(`<a link="#" class="jtt-control"><span></span></a>`);
                    if (node.children.length) {
                        control
                            .on('click', function (evt) {
                                let _self = node;
                                self._toggleNode(_self);
                                $(evt.currentTarget)
                                    .find('span')
                                    .first()
                                    // Note to maintainers, we don't use toggleClass because the nodeOpenGlyph and
                                    // nodeClosedGlyph options may contain classes that persist
                                    // (e.g. Bootstrap's convention 'glyphicon glyphiconX' vs 'glyphicon glyphiconY')
                                    .removeClass((!node.open) ? self.options.nodeOpenGlyph : self.options.nodeClosedGlyph)
                                    .addClass((node.open) ? self.options.nodeOpenGlyph : self.options.nodeClosedGlyph);
                            })
                            .find('span')
                            .first()
                            .addClass((node.open) ? self.options.nodeOpenGlyph : self.options.nodeClosedGlyph);
                        connector.append(control);
                    }
                }
                else { // Modify existing decoration
                    col= node.$row.find("div.jtt-node-offset")
                        .css('margin-left', `${depth * indent}px`);
                    if (!node.children.length) {
                        node.$row.find("a.jtt-control").remove();
                    }
                }

                if (this.options.showLines && node.parent && node.parent !== '/') {
                    let parentPos = col
                        .closest('tbody')
                        .find(`tr[data-jtt-id="${node.parent}"] td:nth-of-type(${treeCol - 1})`)
                        .offset()
                        .top;
                    let connectorHeight = col.offset().top - parentPos - 5;

                    node.$row.find('div.jtt-connector')
                        .addClass('jtt-show-lines')
                        .css('height', `${connectorHeight}px`)
                        .css('margin-top', `-${connectorHeight}px`)
                }
                else {
                    node.$row.find('div.jtt-connector')
                        .removeClass('jtt-show-lines');
                }
            });
        },

        _toggleNode(node) {
            let numChildren = node.children.length;

            node.open = !node.open;

            for (let i = 0; i < numChildren; i++) {
                this._treeWalk(node.children[i], (child) => {
                    if (child.open) {
                        child.$row.toggle(node.open);
                    }
                    else {
                        return false; // Tell treeWalk to not look at children of this node
                    }
                });
            }

            this._redecorate();
        },

        // Sort the table within set constraints
        _sort()
        {

        }

    });

}(jQuery));
