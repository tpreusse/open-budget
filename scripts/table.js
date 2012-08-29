$(function() {

    OpenBudget.table = (function() {
        var $table = $('#table'),
            $tHead = $table.find('thead'),
            $tBody = $table.find('tbody'),
            $overviewHead = $tHead.find('.overview').detach(),
            $overviewTrTemplate = $tBody.find('tr.overview').detach(),
            $compareHead = $tHead.find('.compare').detach(),
            $compareTrTemplate = $tBody.find('tr.compare').detach(),
            $breadcrumb = $('.breadcrumb');
        
        var formatCHF = d3.format(',f');
        var formatDiffPercent = d3.format('+.2');

        var fn = {
            labelOfDepth: [
                'Direktion',
                'Dienststelle',
                'Produktegruppe',
                'Produkt'
            ],
            show: function(nodes) {
                $table.stop(true).animate({
                    opacity: 0
                }, {
                    complete: function() {
                        var dataSets = [],
                            idToIndex = {};

                        $.each(nodes, function(key, node) {
                            var id = node.id.replace(/revenue-|gross_cost-/, '');
                            var index = idToIndex[id];
                            if(index === undefined) {
                                index = dataSets.length;
                                dataSets.push({
                                    name: node.name,
                                    id: id,
                                    nodes: {}
                                });
                                idToIndex[id] = index;
                            }
                            var dataSet = dataSets[index];
                            dataSet.nodes[node.type] = node;
                        });

                        $tHead.empty();
                        $tBody.empty();

                        breadcrumbItems = [];
                        var createBreadcrumbItem = function(node) {
                            if(node) {
                                breadcrumbItems.unshift(node.name);
                                createBreadcrumbItem(node.parent);
                            }
                        };

                        var firstDataSet = dataSets[0];

                        if(firstDataSet.nodes.gross_cost !== undefined && firstDataSet.nodes.revenue !== undefined) {
                            $overviewHead.clone().appendTo($tHead);

                            $.each(dataSets, function(index, dataSet) {
                                var $tr = $overviewTrTemplate.clone();

                                $tr.find('td:eq(0)').text(dataSet.name);
                                $tr.find('td:eq(1)').text(formatCHF(dataSet.nodes.gross_cost.value));
                                $tr.find('td:eq(2)').text(formatCHF(dataSet.nodes.revenue.value));
                                $tBody.append($tr);
                            });
                        }
                        else {
                            var type = firstDataSet.nodes.gross_cost === undefined ? 'revenue' : 'gross_cost';

                            $compareHead.clone().appendTo($tHead).find('th:eq(0)').text(fn.labelOfDepth[firstDataSet.nodes[type].depth]);

                            $.each(dataSets, function(index, dataSet) {
                                var $tr = $compareTrTemplate.clone(),
                                    d = dataSet.nodes[type];

                                $tr.find('td:eq(0)').text(dataSet.name);
                                $tr.find('td:eq(1)').text(formatCHF(d.value));
                                $tr.find('td:eq(2)').text(formatDiffPercent(dataSet.nodes[type].diff)+'%').css('color', d.stroke);
                                $tr.find('td:eq(3)').text(formatCHF(d.value2));
                                $tBody.append($tr);
                            });

                            createBreadcrumbItem(firstDataSet.nodes[type].parent);

                            breadcrumbItems.unshift(type == 'gross_cost' ? 'Bruttokosten' : 'Erlöse');
                        }

                        breadcrumbItems.unshift('Übersicht');

                        var breadcrumbLength = breadcrumbItems.length;
                        $breadcrumb.empty();
                        $.each(breadcrumbItems, function(index, item) {
                            var $item = $('<li></li>');
                            $item.text(item);
                            if(index + 1 < breadcrumbLength) {
                                $item.append('<span class="divider">/</span>');
                            }
                            $item.appendTo($breadcrumb);
                        });

                        $table.animate({opacity:1});
                    }
                });
            }
        };

        return fn;
    })();

});