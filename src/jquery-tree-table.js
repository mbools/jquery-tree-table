/**
 * A JQuery Widget plugin for displaying tables with one column being a tree.
 *
 * License: https://github.com/mbools/jquery-tree-table/blob/master/LICENSE
 *
 * Documentation: https://github.com/mbools/jquery-tree-table/wiki
 *
 */

(function ($, window) {
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

    const CLASSES = {
        MARKER: 'treetable'
    };

    const DEFAULT = {
        SORT_ORDER: 'asc',
        SORT_TYPE: 'alpha',
        OPENGLYPH: 'jtt-open',      // Class(es) for inclusion of open node glyph
        CLOSEDGLYPH: 'jtt-closed',  // Class(es) for inclusion of closed node glyph
        INDENT: 15,                 // Default indentation on each tree level, in px
        ROOTPATH: '/',
        INSERTORDER: {ASC: 'asc', DESC: 'desc'}
    };

    /**
     * Marks debug code, will be excluded in production builds
     *
     * @constant
     * @type {boolean}
     * @default
     * */
    const DEBUG = true;

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
            },
        },

        _columnSettings: [],

        _observers: {},     // DOM observers (when table is active)

        // Widget constructor...
        _create() {
            if (!this.element.hasClass(CLASSES.MARKER)) {
                this.element.addClass(CLASSES.MARKER);
            }
            if (this.element.attr(ATTR.active) !== undefined || this.options.active) {
                this._active(true);
            }

            this._update();
        },


        ///////////////// PUBLIC API

        //// Table level attribute controls

        /**
         * Make the table active/inactive, when no state supplied simply returns current state
         * @param state {boolean} true = active, false =  inactive
         * @returns {boolean} The current state
         */
        active(state) {
            if (state !== undefined) {
                this._active(state);
            }
            return this.options.active;
        },

        /**
         * Set forceTreeConstraints. When no state supplied simply returns current state
         * When forceTreeConstraints is true table rows are ordered by and subbject too all
         * the tree constraints (e.g. fixed/limit parents, child-parent relationships) even when
         * no jtt-tree column is identified.
         * @param state {boolean}
         * @returns {boolean}
         */
        forceTreeConstraints(state) {
            if (state !== undefined) {
                this._forceTreeConstraints = state;
            }
            return this.options.forceTreeConstraints;
        },

        /**
         * Set showLines. When no state supplied simply returns current state.
         *
         * @param state
         * @param immediate {boolean} If true then table is redrawn immediately, when false (the default)
         *                              redraw deferred until either next operation calls for redraw OR user
         *                              explicitly calls redecorate()
         * @returns {boolean}
         */
        showLines(state, immediate = false) {
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

        /**
         * Set the indentation applied to each node level
         * @param indent {int} Indent applied to each node level in px
         * @param immediate {boolean} Whether tree is redrawn immediately
         */
        indent(indent, immediate) {
            this.options.indent = indent;
            this.element.attr(ATTR.indent, indent);
            if (immediate && !this.options.active) this._redecorate();
        },


        /**
         * Set both open and closed glyph icons
         * @param open {string} classed to be applied to span representing openGlyph on a node
         * @param closed {string}  classed to be applied to span representing closedGlyph on a node
         * @param immediate {boolean}
         */
        nodeGlyphs(open, closed, immediate) {
            this.nodeOpenGlyph(open, false);
            this.nodeClosedGlyph(closed, false);
            if (immediate && !this.options.active) this._redecorate();
        },

        /**
         * Set classes to be applied to span representing openGlyph on node
         * @param classes {string} classes to be applied to span representing openGlyph on a node
         * @param immediate {boolean} Whether to redraw the table immediately.
         */
        nodeOpenGlyph(classes, immediate) {
            if (typeof classes === 'string') {
                this.options.nodeOpenGlyph = classes;
                this.element.attr(ATTR.nodeOpenGlyph, classes);
                if (immediate && !this.options.active) this._redecorate();
            }
        },

        /**
         * Set classes to be applied to span representing closedGlyph on node
         * @param classes {string} classes to be applied to span representing closedGlyph on a node
         * @param immediate {boolean} Whether to redraw the table immediately.
         */
        nodeClosedGlyph(classes, immediate) {
            if (typeof classes === 'string') {
                this.options.nodeClosedGlyph = classes;
                this.element.attr(ATTR.nodeClosedGlyph, classes);
                if (immediate && !this.options.active) this._redecorate();
            }
        },


        /**
         * Redecorate the tree, redrawing all connecting lines, icons, etc.
         */
        redecorate() {
            this._redecorate();
        },

        /**
         * Update the tree. This applies constraints set, reorders rows, and then redecorates the tree.
         */
        update() {
            this._update();
        },


        ///////////////////// PRIVATE

        /**
         * Update the whole table applying all constraints, then redraw it.
         * @private
         */
        _update() {
            this._bodyObserverState(false);  // Suspend while we mess with the tbody

            this._updateOptions();
            this._updateColSettings();

            this._buildTree();
            this._imposeTreeConstraints();

            this._sort();

            this._reflowTable();

            this._redecorate();

            if (this.options.active) {
                this._bodyObserverState(true);
            }

        },

        /**
         * Make the internal options match the DOM table attributes, supplying defaults from current option settings
         * @private
         */
        _updateOptions() {
            this.options.active = this.element.attr(ATTR.active) !== undefined ? true : this.options.active;

            this.options.indent = +this.element.attr(ATTR.indent) || this.options.indent;

            let insertOrderAttr = this.element.attr(ATTR.insertOrder);
            if (DEFAULT.INSERTORDER.ASC === insertOrderAttr || DEFAULT.INSERTORDER.DESC === insertOrderAttr) {
                this.options.insertOrder = insertOrderAttr;
            }

            this.options.forceTreeConstraints = this.element.attr(ATTR.forceTreeConstraints) !== undefined ? true : this.options.forceTreeConstraints;
        },

        /**
         * Update the internal column settings to take account of DOM settings
         * @private
         */
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
            if (DEBUG) console.log("Current column settings: " + this._columnSettings);
        },

        /**
         * Create the internal tree structure
         * @private
         */
        _buildTree(){
            let self = this;
            let nodes = {};

            nodes[DEFAULT.ROOTPATH] = {id: DEFAULT.ROOTPATH, children: []};

//            this._fixupParents(); // Globlally set all jtt-parent to jtt-fixed-parent since there's no other possibility

            this._tree = {};

            self.element.find('tbody tr').each((rowi, rowe) => {
                let $row = $(rowe);
                let rowid = $row.attr(ATTR.id);

                if (!rowid) {
                    rowid = self._uuid();
                    $row.attr(ATTR.id, rowid);
                }

                if (nodes[rowid]) {
                    if (self.options.console.errors) console.log(`jquery-tree-table: Duplicate jtt-id (${rowid}) in table at row ${rowi}. Ignored.`);
                    $row.addClass('jtt-error');
                }
                else {
                    let parent = $row.attr(ATTR.fixedParent) || $row.attr(ATTR.parent) || $row.attr(ATTR.limitParent);

                    if (!parent) {
                        // When no parent is specified the row's position is used to find it's closest
                        // sibling with a parent OR the root node if all previous rows have no parent.
                        let $lastParentedNode = $row.prevAll('[' + ATTR.parent + ']').last();
                        if ($lastParentedNode.length) {
                            parent = $lastParentedNode.attr(ATTR.parent);
                        }
                        else {
                            parent = DEFAULT.ROOTPATH;
                        }
                    }

                    if (parent === rowid) {
                        if (self.options.console.errors) console.log(`jQuery-tree-table: ${rowid} defined with itself as parent. Ignored, setting parent to root`);
                        parent = DEFAULT.ROOTPATH;
                        // TODO In tree validation should detect any circular definitions and break them
                    }

                    $row.attr(ATTR.parent, parent);

                    nodes[rowid] = {
                        id: rowid,
                        parent: parent,
                        $row: $row,
                        children: [],
                        open: true,
                    };
                }
            });

            self._tree = nodes[DEFAULT.ROOTPATH];
            delete nodes[DEFAULT.ROOTPATH];

            for (let node in nodes) {
                if (nodes[node].parent !== DEFAULT.ROOTPATH) {
                    nodes[nodes[node].parent].children.push(nodes[node]);
                }
                else {
                    self._tree.children.push(nodes[node]);
                }
            }
        },

        /**
         * Check the defined tree for constraint violations, enforce them by adjusting the tree struture as necessary
         * @private
         */
        _imposeTreeConstraints() {
            let self = this;

            self._treeWalk(self._tree, (node) => {
                // Move node to parents according to limit-parent and fixed-parent constraints
                let fixed_parent = node.$row.attr(ATTR.fixedParent);
                if (fixed_parent) {
                    node.$row.removeAttr(ATTR.limitParent); // Cannot apply when fixed parent specified

                    if (node.parent != fixed_parent) {
                        node.parent = fixed_parent;
                        node.$row.attr(ATTR.parent, fixed_parent);
                    }
                }

                // Move the node under limit parent if constraint not met
                let limit_parent = node.$row.attr(ATTR.limitParent);
                if (limit_parent !== undefined) {
                    let ancestors = this._findAncestors(node);
                    if (ancestors.indexOf(limit_parent) === -1) {
                        node.parent = limit_parent;
                        node.$row.attr(ATTR.parent, limit_parent);
                    }
                }
            });

        },

        // Sort the table within set constraints
        _sort()
        {

        },

        /**
         * Reorder table rows to conform with ordered table structure.
         * @private
         */
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
         * Redraw the table controls
         * @private
         */
        _redecorate() {
            let self = this;

            let indent = self.options.indent;
            let treeCol = self._treeColumn();

            let currentTNode = self._tree.children[0].$row.children('td.jtt-tree-node').index();
            if (DEBUG) console.log(`currentTNode is ${currentTNode} treeCol (with offset) is ${treeCol - 2}`);
            if (currentTNode >= 0 && currentTNode !== treeCol - 2) {
                // Tree has moved columns, been removed, or is not specified, so wipe out any old tree decoration
                let currNodes = self.element.find('.jtt-tree-node');
                currNodes.find('.jtt-node-offset').remove();
                currNodes.find('.jtt-entry').contents().unwrap();
                currNodes.removeClass('jtt-tree-node');
            }

            if (treeCol === 0) return; // No tree to decorate

            // Depth first walk down the tree (which will also be the row order as displayed
            // making life much simpler for calculating connections etc.)...
            self._treeWalk(self._tree, (node, depth) => {
                let col = node.$row.children('td.jtt-tree-node');

                // Establish the connector and controls...
                let connector = col.find('div.jtt-node-offset');
                if (col.length === 0) { // Decorate for the first time...
                    // TODO This currently assumes all columns in a row have no colspan!
                    connector = $(`<div class="jtt-node-offset" style="margin-left: ${depth * indent}px"><div class="jtt-connector"></div></div>`);

                    col = node.$row.children(`td:nth-of-type(${treeCol - 1})`)
                        .addClass('jtt-tree-node')
                        .wrapInner('<div class="jtt-entry"></div>')
                        .prepend(connector);

                }

                // Add/remove node open/close control...
                if (!node.children.length) {
                    node.$row.find("a.jtt-control").remove();
                }
                else {
                    let control = connector.find('.jtt-control');
                    if (control.length === 0) {
                        control = $(`<a link="#" class="jtt-control"><span></span></a>`);
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

                // Note to maintainer: We do this calculation last because the controls added above could
                //                     cause changes in the sizing of the node, which would FUBAR the
                //                     calculations below.
                // Add the connection line (hide it if show-lines false)...
                if (self.options.showLines && node.parent && node.parent !== '/') {
                    let closestParentedRow = node.$row
                        .prevAll(`tr[data-jtt-parent="${node.parent}"]`)
                        .first();
                    if (closestParentedRow.length === 0) {
                        closestParentedRow = node.$row.prev(`tr[data-jtt-id="${node.parent}"]`);
                    }

                    let parentConnector = closestParentedRow.find('div.jtt-connector');

                    let parentPos = parentConnector.offset().top;

                    let connectorHeight = Math.ceil(col.offset().top + (col.height()/2) - (parentPos + parentConnector.outerHeight(false)));

                    node.$row.find('div.jtt-connector')
                        .addClass('jtt-show-lines')
                        .css('height', `${connectorHeight}px`)
                        .css('margin-top', `-${connectorHeight}px`);
                }
                else {
                    node.$row.find('div.jtt-connector')
                        .removeClass('jtt-show-lines');
                }
            });
        },


        ///////////////////// UTILITY

        _toggleAttr(attr, state) {
            let newState = state || !this.element.attr(attr);
            if (newState) {
                this.element.attr(attr, "");
            }
            else {
                this.element.removeAttr(attr);
            }
        },

        /**
         * Make the table active/inactive
         * @param state {boolean} true = active, false = inactive
         * @private
         */
        _active(state){
            let self = this;

            this._toggleAttr(ATTR.active, state);
            self.options.active = state;

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

                self.element.find('thead td, thead th').each(function () {
                    self._observers.thead.observe(this, {attributes: true});
                });
                self._bodyObserverState(true);
            }
            else {
                self._bodyObserverState(false);
                if (self._observers.thead !== undefined) {
                    self._observers.thead.disconnect();
                }
            }
        },

        /**
         * Used to bind to resize and orientationchange events.
         * These are common events that cause tables to change shape/size, which may need the connecting
         * lines redrawing.
         * @param evt
         * @returns {boolean}
         * @private
         */
        _forceRedecorate(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            evt.data._redecorate();
            return false;
        },

        /**
         * Turn the table body observer (defined when table is marked 'active') on/off
         * @param state {boolean} true = on, false = off
         * @private
         */
        _bodyObserverState(state){
            if (this._observers.tbody !== undefined) {
                if (state) {
                    this._observers.tbody.observe(this.element.find('tbody').get()[0], {
                        childList: true,
                        subtree: true,
                        attributes: true
                    });
                    $(window).on("resize orientationchange", this, this._forceRedecorate);
                    if (DEBUG) console.log("OBSERVER ON");
                }
                else {
                    this._observers.tbody.disconnect();
                    $(window).off("resize orientationchange", this._forceRedecorate);
                    if (DEBUG) console.log("OBSERVER OFF");
                }
            }
        },

        /**
         * Any rows that violate table constraints (or simply don't fit the tree flow) are moved to the end of the table
         * bu otherwise maintain their relative positions to one another.
         * @private
         */
        _shiftErrorsToEnd() {
            let errors = $('.jtt-error');
            errors.remove().appendTo(this.element);
        },

        /**
         * Find the column in the table that is to be displayed as a tree
         * @returns {number} Column number of column to be treated as tree 1 is leftmost column in table
         * @private
         */
        _treeColumn() {
            return this._columnSettings.findIndex((colset) => colset && colset.tree !== undefined) + 1;
        },

        /**
         * Force jtt-parent to match any jtt-fixed-parent
         * @private
         */
        _fixupParents() {
            this.element.find(`tbody tr[${ATTR.fixedParent}]`).attr(ATTR.parent, function () {
                return this.getAttribute(ATTR.fixedParent);
            });
        },

        /**
         * Walk up the parent chain returning array of ancestors
         * @param node {object} Node in tree
         * @returns {Array} Array of tree nodes that are ancestors to node
         * @private
         */
        _findAncestors(node) {
            let ancestors = [];
            let next_node = node;
            while (next_node.parent !== undefined) {
                ancestors.push(next_node.parent);
                next_node = next_node.parent;
            }
            return ancestors;
        },

        /**
         * UUID generator
         *
         * Kudos broofa http://stackoverflow.com/a/2117523
         * @returns {string} An RFC4122 [https://www.ietf.org/rfc/rfc4122.txt] version 4 (random) UUID
         * @private
         */
        _uuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * Simply depth first tree walker
         * @param node {object}
         * @param cb {function} callback for each node. Receives (node, depth). If cb returns false the _treeWalk the walk does not follow the nodes children
         * @param depth {int} the level of the node in the tree (0 = root node)
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

        /**
         * Toggles the node and it's children display on/off
         * Will honour any child nodes previous display state (so will not open previously closed nodes).
         * @param node
         * @private
         */
        _toggleNode(node) {
            let numChildren = node.children.length;

            node.open = !node.open;

            let toggleOpenNode = (child) => {
                child.$row.toggle(node.open);
                return child.open; // Tell treeWalk to not to bother with children of an already closed node
            };

            for (let i = 0; i < numChildren; i++) {
                this._treeWalk(node.children[i], toggleOpenNode);
            }

            this._redecorate();
        },

    });
}(jQuery, window));
