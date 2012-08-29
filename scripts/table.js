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

        var helpers = {
            cleanId: function(id) {
                return id.replace(/revenue-|gross_cost-/, '');
            },
            cleanIdFromTr: function(tr) {
                return $.trim($(tr).attr('id').replace(/^tr-/, ''));
            }
        };

        var highlightedCircles = d3.select();
        $tBody.on('mouseover', 'tr', function() {
            var cleanId = helpers.cleanIdFromTr(this);
            highlightedCircles.classed('hover', 0);
            highlightedCircles = d3.selectAll('svg circle#c-revenue-'+cleanId+', svg circle#c-gross_cost-'+cleanId).classed('hover', 1);
        }).on('mouseout', 'tr', function() {
            highlightedCircles.classed('hover', 0);
        });

        var fn = {
            labelOfDepth: [
                'Direktion',
                'Dienststelle',
                'Produktegruppe',
                'Produkt'
            ],
            highlight: function(id) {
                $tBody.find('tr').removeClass('hover');
                if(id) {
                    $tBody.find('#tr-'+helpers.cleanId(id)).addClass('hover');
                }
            },
            show: function(nodes) {
                $table.stop(true).animate({
                    opacity: 0
                }, {
                    complete: function() {
                        var dataSets = [],
                            idToIndex = {};

                        $.each(nodes, function(key, node) {
                            var id = helpers.cleanId(node.id);
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

                                $tr.attr('id', 'tr-'+dataSet.id);
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

                                $tr.attr('id', 'tr-'+dataSet.id);
                                $tr.find('td:eq(0)').text(dataSet.name);
                                $tr.find('td:eq(1)').text(formatCHF(d.value));
                                $tr.find('td:eq(2)').text(formatDiffPercent(dataSet.nodes[type].diff)+'%').css('color', d.stroke);
                                $tr.find('td:eq(3)').text(formatCHF(d.value2));
                                $tBody.append($tr);
                            });

                            if(firstDataSet.nodes[type].depth < 3) {
                                $tBody.find('tr').click(function() {
                                    d3.select('#c-'+type+'-'+helpers.cleanIdFromTr(this)).each(function(d, i) {
                                        OpenBudget.visualisation.zoomIn.apply(this, [d, i]);
                                    });
                                }).css('cursor', 'pointer');
                            }

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
                                $item.click(function() {
                                    OpenBudget.visualisation.zoomOut();
                                }).css('cursor', 'pointer');
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