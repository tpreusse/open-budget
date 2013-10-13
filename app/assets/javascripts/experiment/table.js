OpenBudget.tableColumnSpec = {
    label: '',
    foot: '',
    cells: [
        {
            value: function(d) { return d; },
            format: {
                format: function(v) { return v; },
                suffix: ''
            } || undefined,
            creator: function(value, format) {} || undefined // this = d3.selection of <td>
        }
    ]
};

OpenBudget.table = function(config) {
    config = config || {};

    var columns = [];

    function table(selection) {
        selection.each(function(data) {
            var tableSelection = d3.select(this);

            var ths = tableSelection.select('thead tr').selectAll('th').data(columns);
            ths.enter().append('th');
            ths.each(function(column) {
                var th = d3.select(this);
                th.text(column.label);
                th.attr('colspan', column.cells.length);
                column.cells.forEach(function(cell) {
                    if(cell.format) {
                        th.append('br');
                        th.append('span')
                            .classed('format', 1)
                            .text('(' + cell.format.suffix + ')');
                    }
                });
            });
            ths.exit().remove();

            var footTds = tableSelection.select('tfoot tr').selectAll('td').data(columns);
            footTds.enter().append('td');
            footTds.attr('colspan', function(column) { return column.cells.length; });
            footTds.text(function(column) {
                if(typeof column.foot === 'function') {
                    return column.foot(data);
                }
                else {
                    return column.foot;
                }
            });
            footTds.exit().remove();

            // consider selection matching instead of rm & create all
            tableSelection.select('tbody').selectAll('tr').remove();

            var trs = tableSelection.select('tbody').selectAll('tr')
                .data(data).enter()
                    .append('tr')
                        .attr('class', function(d) {
                            return d.detail ? 'has-detail' : '';
                        });

            trs.on('click', config.detailCallback);

            columns.forEach(function(column) {
                column.cells.forEach(function(cell) {
                    trs.append('td').each(function(d) {
                        var td = d3.select(this),
                            value = cell.value(d);

                        if(cell.creator) {
                            cell.creator.call(td, value, cell.format);
                        }
                        else {
                            td.text(cell.format ? cell.format.format(value) : value);
                        }
                    });

                });
            });
        });
    }

    table.columns = function(value) {
        if (!arguments.length) return columns;
        columns = value;
        return table;
    };

    return table;
};
