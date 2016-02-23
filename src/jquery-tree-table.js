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

        const DEFAULT = {
            SORT_ORDER: 'asc',
            SORT_TYPE: 'alpha',
            OPENGLYPH: 'jtt-open',
            CLOSEDGLYPH: 'jtt-closed',
            INDENT: 15
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
            },

            _columnSettings: [],

            // Widget constructor...
            _create() {
                if (!this.element.hasClass("treetable")) {
                    this.element.addClass("treetable");
                }

                this._update();
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
                this._updateOptions();
                this._updateColSettings();
                this._buildTree();

                this._sort();

                this._reflowTable();

                this._redecorate();

            },

            _shiftErrorsToEnd() {
                let errors = $('.jtt-error');
                errors.remove().appendTo(this.element);
            },

            _updateOptions() {
                this.options.active = this.options.active || this.element.attr('data-jtt-active');
                this.options.insertOrder = this.options.insertOrder || this.element.attr('data-jtt-insert-order');
                this.options.forceTreeConstraints = this.options.forceTreeConstraints || this.element.attr('data-jtt-force-tree-constraints');
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
                            tree: $colc.data('jtt-tree'),
                            sort: $colc.data('jtt-sort'),
                            sortOrder: $colc.data('jtt-sort-order'),
                            sortType: $colc.data('jtt-sort-type'),
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
                        console.log(`jquery-tree-table: Duplicate jtt-id (${rowid}) in table at row ${rowi}. Ignored.`);
                        $row.addClass('jtt-error');
                    }
                    else {
                        let parent = $row.data('jtt-fixed-parent') || $row.data('jtt-parent');
                        if (!parent) {
                            let $lastParentedNode = $row.prevAll('[data-jtt-parent]').last();
                            if ($lastParentedNode) {
                                parent = $lastParentedNode.data('jtt-parent');
                            }
                            else {
                                parent = '/';
                            }
                        }

                        if (parent === rowid) {
                            console.log(`jQuery-tree-table: ${rowid} defined with itself as parent. Ignored, setting parent to root`);
                            parent = '/';
                            // TODO This should really detect any circular definitions and break them
                        }

                        if (!rowid) {
                            rowid = self._guid();
                            $row.attr('data-jtt-id', rowid);
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
                    let rows = this.element.find('tbody tr');
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
                if (treeCol === 0) return; // No tree to decorate

                this._treeWalk(this._tree, (node, depth) => {
                    let col = node.$row.find('td.jtt-tree-node');
                    if (col.length === 0) { // Decorate for the first time...
                        // TODO This currently assumes all columns in a row have no colspan!
                        let connector = $(`<div class="jtt-node-offset" style="margin-left: ${depth * indent}px"><div class="jtt-connector"></div></div>`);

                        col = node.$row.find(`td:nth-of-type(${treeCol - 1})`)
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
                                        .toggleClass(self.options.nodeOpenGlyph + " " + self.options.nodeClosedGlyph);
                                })
                                .find('span')
                                .first()
                                .addClass((node.open) ? self.options.nodeOpenGlyph : self.options.nodeClosedGlyph);
                            connector.append(control);
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

        })
        ;

    }
    (jQuery)
)
;
