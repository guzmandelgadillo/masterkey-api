(function (angular) {
    angular.module("masterkey.api").factory("quoteService", ["$q", "courseService", "DraftCommand", "lineCommand", "SaleQueryCommand", "currencyService", "Price", quoteService]);
    function quoteService($q, courseService, DraftCommand, lineCommand, SaleQueryCommand, currencyService, Price) {
        function setQuoteDataScope(scope, courseId, courseVariantId) {
            if (!scope) return;
            var courseData = courseService.getCourse(courseId);
            var variantData = courseService.getCourseVariant(courseId, courseVariantId);
            var eventlistData = courseService.listByCourseVariant(courseVariantId);
            var promotionlistData = courseService.listOptionalPromotion(courseId);
            var addServices = _.curry(function (draftScope, data) {
                var lines = buildServiceLineCommand(data);
                scope.cmd.addAssociatedService(lines);

                return data;
            })(scope);

            var bindProduct = _.curry(function (draftScope, key, data) {
                draftScope.options[key] = { product: data };

                return data;
            })(scope);

            courseData.$promise.then(responseCourseData);
            variantData.$promise.then(responseVariantData);
            eventlistData.$promise.then(responseEventlistData);
            
            // Initialize values
            scope.course = courseData;
            scope.courseVariant = variantData;
            scope.courseEventList = eventlistData;
            scope.optionalPromotionList = promotionlistData;
            scope.draft = {};
            scope.options = [];
            scope.localCurrency = null;
            scope.saveMode = "existing";
            scope.opportunity = {};
            scope.quote = {};
            scope.cmd = {
                courseLine: {
                    event: {}
                },
                associatedServiceLine: {},
                agencyPromotionList: {}
            };
            scope.courseLine = scope.cmd.courseLine;

            function generateData(response) {
                var associateds = courseService.findAllAssociatedByCourse(scope.course.id);
                var accommodations = courseService.listAccommodationByCourse(scope.course.id);
                var providers = courseService.findAllProvidedByCourse(scope.course.id);
                associateds.$promise
                    .then(bindProduct('associatedServiceLine'))
                    .then(addServices);
                accommodations.$promise
                    .then(bindProduct('accommodationLine'));
                providers.$promise
                    .then(bindProduct('providerServiceLine'))
                    .then(addServices)
                    .then(responseProviderList);
                scope.saleQueryCommand = SaleQueryCommand.createFromState({
                    status: ['Active', 'Pending'],
                    max: 10
                });

                var query = scope.saleQueryCommand.toQueryParams();
                scope.saleList = courseService.listSales(query);
                scope.recentSalesList = scope.saleList;
            }

            function responseCourseData(response) {
                scope.cmd.course = courseData;
                // Default data for new Sales
                scope.opportunity.courseType = courseData.type;
                scope.opportunity.isClientStudent = true;
                tryUpdateOptions(scope.cmd);
            }

            function responseEventlistData(response) {
                scope.cmd.courseLine.event = eventlistData[0];
                tryUpdateOptions(scope.cmd);
            }

            function responseProviderList(response) {
                scope.providerList = buildProviderList(response);
                scope.cmd = refreshCommand(scope.cmd);
            }

            function responseVariantData(response) {
                scope.cmd.courseLine.product = variantData;
                tryUpdateOptions(scope.cmd);
            }

            function tryUpdateOptions(cmd) {
                if (courseData.$resolved && variantData.$resolved && eventlistData.$resolved) {
                    scope.options = updateOptions(scope, cmd);
                    applyLocalCurrency(scope).then(function (response) {
                        if (response)
                            response.then(generateData);
                        else
                            generateData();
                    });
                }
            }
        }

        function applyDraftToCommand(draft, cmd) {
            /**
             * Add draft information to the given line
             */
            function addDraftToLine(id, line) {

                if (!line.added) { return line; }

                line.draftLine = _.find(draft.lines, function (l) {
                    return l.product.id === line.product.id && l.product.class === line.product.class;
                });

                return line;
            }

            var associatedServiceLine = _.reduce(cmd.associatedServiceLine, function (acc, line, id) {
                acc[id] = addDraftToLine(id, line);

                return acc;
            }, {});

            return angular.extend(new DraftCommand(), cmd, {
                associatedServiceLine: associatedServiceLine
            });
        }

        function applyLocalCurrency(scope) {
            return currencyService.loadExchangeCurrency().then(function (currency) {
                scope.localCurrency = currency;
                return refreshDraft(scope.cmd, scope);
            });
        }

        function buildProviderList(providerServiceList) {
            return _.reduce(providerServiceList, function (providerList, service) {
                var exists = _.some(providerList, { id: service.provider.id });
                if (exists) { return providerList; }
                service.provider.$visible = true;

                return providerList.concat([service.provider]);
            }, []);
        }

        function buildServiceLineCommand(associatedServiceList) {
            return _.reduce(associatedServiceList, function (obj, srv) {
                obj[srv.id] = new lineCommand(srv);
                return obj;
            }, {});
        }

        function create(draftCommand) {
            return courseService.postCreateDraft(marshalCommand(draftCommand)).then(postProcessDraft);
        }

        function createCourseLineOptions(course, courseVariant, courseEvent, courseEventList) {
            var durations = [];
            if (courseEvent && courseEvent.duration && courseVariant && courseVariant.currentBasePrice) {
                durations = [
                  _.range(courseEvent.duration.min, courseEvent.duration.max + 1),
                  _.range(courseVariant.duration.min, courseVariant.duration.max + 1),

                  // Add currentBasePrice supported qty
                  courseVariant.currentBasePrice.supportedQty
                ];
            }

            return {
                product: _.filter(course.variant, function (v) {
                    return v.id !== courseVariant.id;
                }),
                event: courseEventList,

                // Calculate in service
                qty: _.intersection(durations[0], durations[1], durations[2])
            };
        }

        /**
         * Add lines with localPrice using the currency given
         * 
         * @param  {Array<DraftLine>} lines 
         * @return {Array<Price>}      
         */
        function exchange(draft, currency) {
            var priceList = groupByCurrency(draft.lines),

            rates = _.map(priceList, function (p) {
                var unit = currencyService.convert(1, p.currency, currency.rates);
                return new Price(unit, p.currency);
            }),

            localTotal = _.reduce(priceList, function (sum, l) {

                var local = currencyService.convert(l.amount, l.currency, currency.rates);

                return sum.add(local);

            }, new Price(0.0, currency.currency)),


            lines = _.map(draft.lines, function (l) {
                return angular.extend({}, l, {
                    localTotal: new Price(
                      currencyService.convert(l.total, l.currency, currency.rates),
                      currency.currency
                    )
                });
            });


            return angular.extend({}, draft, {
                lines: lines,
                localTotal: localTotal,
                total: {
                    byCurrency: priceList,
                    local: localTotal,
                    rates: rates
                }
            });
        }

        /**
         * Find all lines with the given type
         *
         * @param {Array<Lines>} lines, draft line
         * @param {String}  type 
         */
        function findLines(lines, type) {

            var types = {
                course: 'CourseVariant',
                accommodation: 'Accommodation',
                instituteService: 'InstituteServicee',
                providerService: 'ProviderServicee'
            };

            return _.filter(lines, function (l) {
                return l.type === types[type];
            });
        }

        /**
         * Given a alist of prices, all prices areg
         * @param  {[type]} lines [description]
         * @return {[type]}       [description]
         */
        function groupByCurrency(lines) {
            var currencyMap = _.groupBy(lines, 'currency');

            return _.map(Object.keys(currencyMap), function (c) {

                var total = _.reduce(currencyMap[c], function (sum, l) {
                    return sum + l.total;
                }, 0);

                return new Price(total, c);
            });
        }

        function mapAndFilterLines(lines) {

            lines = lines || {};

            var linesArray = _.map(Object.keys(lines), function (k) { return lines[k]; });

            return _.filter(linesArray, { added: true });
        }

        function marshalCommand(draftCommand) {
            function id(property) {
                return property ? property.id : undefined;
            }

            return {
                client: id(draftCommand.client),
                course: id(draftCommand.course),
                courseLine: marshalLine(draftCommand.courseLine),
                accommodationLine: marshalLine(draftCommand.accommodationLine),

                // Map lservice lines
                associatedServiceLine: _.map(
                  mapAndFilterLines(draftCommand.associatedServiceLine),
                  marshalLine
                ),

                agencyPromotionList: _.map(draftCommand.agencyPromotionList, id)
            };
        }

        function marshalLine(line) {

            function same(property) { return property; }
            function date(property) {
                if (property) {
                    var date = new Date(property);
                    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
                }
            }
            function id(property) { return property ? property.id : null; }
            function optional(property) { return property ? property : undefined; }

            function applyMarshaller(callback, value) {
                var callbackList = angular.isArray(callback) ? callback : [callback];

                return _.reduce(callbackList, function (result, fn) {
                    return fn(result);
                }, value);
            }

            var properties = {
                qty: same,
                startDate: date,
                endDate: date,
                product: id,
                event: [id, optional]
            };

            if (line) {
                return _.reduce(Object.keys(properties), function (out, p) {
                    out[p] = applyMarshaller(properties[p], line[p]);

                    return out;
                }, {});
            }
        }

        function postSaveQuote(scope) {
            var saleData = {
                name: scope.course.name,
                courseType: scope.course.type,
                client: scope.clientId
            };
            return $q(function (resolve, reject) {
                courseService.postCreateSale(saleData).then(function (response) {
                    var data = marshalCommand(scope.cmd);
                    courseService.postCreateQuote(response.data.id, data).then(function (response) {
                        resolve(response);
                    }, function (error) { reject(error); });
                }, function (error) { reject(error); }, function (message) { notify(message); });
            });
        }

        function postProcessDraft(response) {
            var draft = response.data;
            return angular.extend({}, draft, {
                // Notes are grouped by noteType to allow showing notes in different locations
                notesByType: _.groupBy(draft.notes, 'noteType'),
                lines: _.map(draft.lines, sortItems),
                courseLine: findLines(draft.lines, 'course')[0],
                accommodationLine: findLines(draft.lines, 'accommodation')[0],
                instituteServiceLines: findLines(draft.lines, 'instituteService'),
                providerServiceLines: findLines(draft.lines, 'providerService')
            });
        }

        function refreshCommand(draftCommand, options) {
            return angular.extend(new DraftCommand(), draftCommand, {
                courseLine: updateCourseLine(draftCommand.courseLine, options),
                accommodationLine: updateAccommodationLine(draftCommand)
            });
        }

        function refreshDraft(cmd, scope) {
            scope.cmd = refreshCommand(cmd, scope.options);
            scope.options = updateOptions(scope, scope.cmd, scope.options);

            // Aquí falta insertar el objeto scope.cmd
            return create(scope.cmd).then(function (draft) {
                scope.draft = exchange(draft, scope.localCurrency);
                scope.cmd = applyDraftToCommand(draft, scope.cmd);
            });
        }

        /**
         * Return a new line with sorted items
         * Items are sorted by type and category
         * Useful to allow items flashing after draft refresh
         * 
         * @param  {Lines} lines 
         * @return {Lines}       
         */
        function sortItems(line) {
            var types = {
                BasePrice: 0,
                Fee: 1
            },

            categories = {
                TuitionFee: 0,
                AccommodationFee: 0,
                SearchLodgingFee: 1,
                InscriptionFee: 1,
                CustomFee: 2
            };


            function getIndex(item) {
                var
                type = types[item.type] || 10,
                category = categories[item.category] || 10;

                return type + category;
            }

            return angular.extend({}, line, {
                items: line.items.sort(function (a, b) {
                    return getIndex(b) - getIndex(a);
                })
            });
        }

        function updateCourseLine(courseLine, options) {
            if (options && options.courseLine && options.courseLine.qty)
                courseLine.qty = courseLine.qty || options.courseLine.qty[0];
            return courseLine;
        }

        function updateAccommodationLine(draftCommand) {
            var line = draftCommand.accommodationLine;

            if (line && line.product) {
                return angular.extend({}, line, {
                    qty: line.qty || draftCommand.courseLine.qty,
                    startDate: line.startDate || draftCommand.courseLine.event.start
                });
            }
        }

        function updateOptions(scope, cmd, options) {
            function getOption(key) {
                var defaultVal = { product: null };

                if (!options) { return defaultVal; }

                return options[key].product ? options[key] : defaultVal;
            }

            return {
                courseLine: createCourseLineOptions(
                    scope.course,
                    scope.courseVariant,
                    cmd.courseLine.event,
                    scope.courseEventList
                ),
                accommodationLine: getOption('accommodationLine'),
                associatedServiceLine: getOption('associatedServiceLine'),
                providerServiceLine: getOption('providerServiceLine')
            };
        }

        return {
            applyDraftToCommand: applyDraftToCommand,
            create: create,
            exchange: exchange,
            postSaveQuote: postSaveQuote,
            refreshCommand: refreshCommand,
            refreshDraft: refreshDraft,
            setQuoteDataScope: setQuoteDataScope,
            updateOptions: updateOptions
        };
    }
})(angular);

