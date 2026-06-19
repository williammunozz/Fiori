sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator"

], function (ControllerExtension, MessageToast, BusyIndicator) {
    "use strict";

    /**
     * Mapeo país → columnas visibles.
     */
    const COLUMN_VISIBILITY_BY_COUNTRY = {
        "DO": [
            "Corporation",
            "Code",
            "CreditLimit",
            "LastPaymentDate",
            "Customer",
            "CustCreatDate",
            "FullName",
            "Address",
            "Phone",
            "Mobile",
            "Status",
            "BalanceCurrent",
            "D0to30",
            "D31to60",
            "D61to90",
            "D91to120",
            "D121to150",
            "Mas151",
            "TotalBalance",
            "Currency"
        ],
        "CO": [
            "IdentificationType",
            "IdentificationNumber",
            "AccountNumber",
            "FullName",
            "OpenDate",
            "DueDate",
            "Situation",
            "AccountStatus",
            "StatusDate",
            "Rating",
            "AgingDays",
            "InitialAmount",
            "OutstandingBalance",
            "MonthlyInstallment",
            "OverdueBalance",
            "PaidInstallments",
            "OverdueInstallments",
            "PaymentDeadline",
            "PaymentDate",
            "FilingOffice",
            "FilingCity",
            "FilingCityCode",
            "ResidenceCity",
            "ResidenceCityCode",
            "ResidenceDept",
            "ResidenceAddress",
            "ResidencePhone",
            "WorkCity",
            "WorkCityCode",
            "WorkDept",
            "WorkAddress",
            "WorkPhone",
            "MailCity",
            "MailCityCode",
            "MailDept",
            "MailAddress",
            "Email",
            "Phone",
            "TargetSubscriber"
        ],
        "HN": [
            "IdentificationNumber",
            "FullName",
            "Address",
            "Customer",
            "PersonType",
            "CreditLimit",
            "OpenDate",
            "BalanceCurrent",
            "Currency"
        ],
        "PA": [
            "Rating",
            "IdentificationType",
            "IdentificationNumber",
            "AccountNumber",
            "FullName",
            "ChangeType",
            "Situation",
            "AccountStatus",
            "StatusDate",
            "AgingDays",
            "OverdueBalance",
            "Currency"
        ]
    };

    const ALL_CONTROLLABLE_COLUMNS = [
        "Corporation",
        "Code",
        "CreditLimit",
        "LastPaymentDate",
        "Customer",
        "CustCreatDate",
        "CustomerName",
        "CompanyCode",
        "Country",
        "CutoffDate",
        "Address",
        "Phone",
        "Mobile",
        "Status",
        "BalanceCurrent",
        "D0to30",
        "D31to60",
        "D61to90",
        "D91to120",
        "D121to150",
        "Mas151",
        "TotalBalance",
        "Currency",
        "Rating",
        "IdentificationType",
        "IdentificationNumber",
        "AccountNumber",
        "FullName",
        "OpenDate",
        "DueDate",
        "Situation",
        "AccountStatus",
        "StatusDate",
        "AgingDays",
        "InitialAmount",
        "OutstandingBalance",
        "MonthlyInstallment",
        "OverdueBalance",
        "PaidInstallments",
        "OverdueInstallments",
        "PaymentDeadline",
        "PaymentDate",
        "PersonType",
        "FilingOffice",
        "FilingCity",
        "FilingCityCode",
        "ResidenceCity",
        "ResidenceCityCode",
        "ResidenceDept",
        "ResidenceAddress",
        "ResidencePhone",
        "WorkCity",
        "WorkCityCode",
        "WorkDept",
        "WorkAddress",
        "WorkPhone",
        "MailCity",
        "MailCityCode",
        "MailDept",
        "MailAddress",
        "Email",
        "TargetSubscriber"
    ];

    const namespace = "com.sap.gateway.srvd.zsd_fiar018e_risk_cntr_rpt.v0001.";

    return ControllerExtension.extend("argos.zfiar018e.zffiar018er.ext.controller.ConfigColsReportExt", {

        override: {

            /**
             * Hook V4: se ejecuta cuando la vista del List Report está lista.
             * Aquí accedemos al FilterBar y nos suscribimos a cambios.
             */
            onInit: function () {

                this._oHiddenColumns = {};

                //console.log("[ConfigCols] >>> onInit ejecutado (V4)");
                this._listenersAttached = false;
                // El FilterBar puede no estar listo aún en onInit, esperamos
                this._waitForFilterBar();
            },

            /**
             * Hook V4 oficial: se dispa
             * ra antes de filtrar/refrescar la tabla.
             * Equivalente al onBeforeRebindTable de V2.
             */
            onAfterBinding: function () {
                //console.log("[ConfigCols] >>> onAfterBinding (V4)");
                this._applyColumnVisibilityByCountry();

                // Only hook once, on first binding
                if (this._initialSelectDone) return;

                var oMdcTable   = this._getTableV4();
                var oRowBinding = oMdcTable?.getRowBinding();

                if (!oRowBinding) return;

                // ✅ attachEventOnce = fires ONLY on the first OData response, never again
                oRowBinding.attachEventOnce("dataReceived", function () {

                    var oInnerTable = this.base.byId("fe::table::ZCEFIAR018E_RISK_CENTER_RPT::LineItem-innerTable");
                    if (!oInnerTable) return;

                    var oSelPlugin = oInnerTable.getPlugins().find(function (p) {
                        return p.isA("sap.ui.table.plugins.MultiSelectionPlugin");
                    });

                    if (oSelPlugin) {
                        oSelPlugin.setLimit(0);
                        oSelPlugin.selectAll();
                    } else {
                        oInnerTable.selectAll();
                    }

                    this._initialSelectDone = true;

                }.bind(this));  
            },

       

            _selectAllRows: function (oTable) {

                var iCount = oTable.getRows().length;
                if (iCount > 0) {
                    // Select all visible rows in GridTable
                    var oSelPlugin = oTable.getPlugins().find(function (p) {
                        return p.isA("sap.ui.table.plugins.MultiSelectionPlugin");
                    });

                    if (oSelPlugin) {
                        oSelPlugin.selectAll();   // ✅ selects all loaded rows
                    } else {
                        oTable.selectAll();        // fallback
                    }
                }
            }

        },

        onDownload: async function () {

            BusyIndicator.show(0);

            try {

                const oTable    = this._getTableV4();
                const aContexts = await oTable.getRowBinding().requestContexts();

            // ── Filter only checked rows ──────────────────────────
            const aSelected = aContexts.filter(ctx => ctx.bSelected === true);

            if (!aSelected.length) {
                MessageToast.show("Por favor, seleccione al menos una fila para descargar.");
                BusyIndicator.hide();
                return;
            }

            // 2. Get raw data — same logic, just using aSelected instead of aContexts
            const aRows = aSelected.map(ctx => ctx.getObject()); // ← only change
            const aKeys = [];

                aRows.forEach(oRow => {
                    const oKeyObj = {};

                    Object.keys(oRow).forEach(sKey => {
                        if (
                            !sKey.startsWith("@") &&
                            !sKey.startsWith("$") &&
                            sKey !== "IsActiveEntity" &&
                            sKey !== "HasActiveEntity" &&
                            sKey !== "HasDraftEntity" &&
                            typeof oRow[sKey] !== "object"
                        ) {
                            oKeyObj[sKey] = oRow[sKey];
                        }
                    });

                    aKeys.push(oKeyObj);
                });

                const oModel = this.getView().getModel();
                var oOperation = oModel.bindContext("/report/" + namespace + "onDownload(...)");

                // send to RAP
                oOperation.setParameter("fileContent", btoa(encodeURIComponent(JSON.stringify(aKeys))));
                oOperation.setParameter("country", this._getSelectedCountry());

                await oOperation.execute();

                const oResult = oOperation.getBoundContext().getObject();

                // 6. Decode and download
                const sBinary = atob(oResult.fileContent);
                const aBytes = new Uint8Array(sBinary.length);

                for (let i = 0; i < sBinary.length; i++) {
                    aBytes[i] = sBinary.charCodeAt(i);
                }
                // const oBlob = new Blob([aBytes], { type: "text/plain;charset=utf-8" });
                const oBlob = new Blob([aBytes], { type: oResult.mimeType || "application/octet-stream" });
                const sUrl = URL.createObjectURL(oBlob);

                const oLink = document.createElement("a");
                oLink.href = sUrl;
                //oLink.download = "report_export.txt";
                oLink.download = oResult.fileName || "report_export.txt";

                oLink.click();
                URL.revokeObjectURL(sUrl);

                sap.m.MessageToast.show("File downloaded successfully.");

            } catch (oError) {
                sap.m.MessageBox.error("Error generating file: " + oError.message);
            }

            BusyIndicator.hide();

        },

        /* ─────────────────────────────────────────────
         *  Localización de controles V4
         * ───────────────────────────────────────────── */

        _waitForFilterBar: function () {
            
            if (!this._setupAttempts) {
                this._setupAttempts = 0;
            }

            this._setupAttempts++;

            const oFilterBar = this._getFilterBarV4();

            if (!oFilterBar) {
                if (this._setupAttempts < 20) {
                    setTimeout(this._waitForFilterBar.bind(this), 500);
                } else {
                    // console.error("[ConfigCols] FilterBar V4 no encontrado tras 20 intentos");
                }
                return;
            }

            // console.log("[ConfigCols] FilterBar V4 encontrado:", oFilterBar.getId());
            // console.log("[ConfigCols] Tipo:", oFilterBar.getMetadata().getName());

            this._attachFilterListeners(oFilterBar);
        },

        /**
         * Busca el FilterBar de V4 en la vista.
         * V4 usa sap.fe.macros.filterBar.FilterBarAPI (envoltorio) +
         * sap.ui.mdc.FilterBar (control real interno).
         */
        _getFilterBarV4: function () {
            const oView = this.base.getView();

            // Intento 1: sap.ui.mdc.FilterBar (el control real)
            let aBars = oView.findAggregatedObjects(true, (oControl) => {
                return oControl.isA && oControl.isA("sap.ui.mdc.FilterBar");
            });

            if (aBars.length > 0) return aBars[0];

            // Intento 2: sap.fe.macros.filterBar.FilterBarAPI (envoltorio)
            aBars = oView.findAggregatedObjects(true, (oControl) => {
                return oControl.isA && oControl.isA("sap.fe.macros.filterBar.FilterBarAPI");
            });

            if (aBars.length > 0) return aBars[0];

            return null;
        },

        /**
         * Busca la tabla MDC del List Report.
         */
        _getTableV4: function () {

            const oView = this.base.getView();

            // Intento 1: sap.ui.mdc.Table (el control real)
            let aTables = oView.findAggregatedObjects(true, (oControl) => {
                return oControl.isA && oControl.isA("sap.ui.mdc.Table");
            });

              // Filter to get ONLY the main list report table
            const oMainTable = aTables.find(oTable => {

                // 1. Must be visible in the DOM (value help tables are lazy, not rendered yet)
                if (!oTable.getDomRef()) return false;

                // 2. Parent must NOT be a FilterBar or ValueHelp container
                let oParent = oTable.getParent();

                while (oParent) {
                    const sType = oParent.getMetadata?.().getName?.() ?? "";
                    if (
                        sType.includes("FilterBar")   ||
                        sType.includes("valuehelp")    ||
                        sType.includes("ValueHelp")   ||
                        sType.includes("FilterField")
                    ) return false;
                    oParent = oParent.getParent();
                }
                return true;
            });

            if (oMainTable) return oMainTable;

            // Intento 2: TableAPI de Fiori Elements
            oMainTable = oView.findAggregatedObjects(true, (oControl) => {
                return oControl.isA && oControl.isA("sap.fe.macros.table.TableAPI");
            });

            if (oMainTable) return oMainTable;

            return oMainTable ?? null;
            
        },

        /* ─────────────────────────────────────────────
         *  Suscripción a eventos del FilterBar V4
         * ───────────────────────────────────────────── */

        _attachFilterListeners: function (oFilterBar) {

            if (this._listenersAttached) {
                return;
            }

            console.log("[ConfigCols] Eventos disponibles del FilterBar:",
                Object.keys(oFilterBar.mEventRegistry || {}));

            // Evento V4: search (cuando pulsan Go)
            if (oFilterBar.attachSearch) {

                oFilterBar.attachSearch(() => {
                    console.log("[ConfigCols] *** FilterBar search ***");
                    this._applyColumnVisibilityByCountry();
                    this._applyRowsSelection();
                });
                console.log("[ConfigCols] Listener 'search' suscrito");

            }

            // Evento V4: filtersChanged (cualquier cambio de filtro)
            if (oFilterBar.attachFiltersChanged) {

                oFilterBar.attachFiltersChanged(() => {
                    console.log("[ConfigCols] *** FilterBar filtersChanged ***");
                    this._applyColumnVisibilityByCountry();
                });
                console.log("[ConfigCols] Listener 'filtersChanged' suscrito");

            }

            this._listenersAttached = true;

            // Aplica una vez al inicio por si hay valor pre-cargado
            this._applyColumnVisibilityByCountry();
        },

        /**
         * Clears the table rows immediately when country changes,
         * so old data doesn't stay visible while the new request loads.
         */
        _clearTableData: function () {
            const oTable = this._getTableV4();
            if (!oTable) return;

            try {
                // ── Option 1: suspend/resume the binding (cleanest for OData V4) ──
                const oRowBinding = oTable.getRowBinding
                    ? oTable.getRowBinding()
                    : oTable.getBinding("rows") || oTable.getBinding("items");

                if (oRowBinding) {
                    oRowBinding.suspend();   // stops rendering data
                    oRowBinding.resume();    // resumes empty until next request completes
                    console.log("[ConfigCols] Binding suspended/resumed — table cleared");
                    return;
                }

            } catch (e) {
                console.warn("[ConfigCols] suspend/resume failed:", e);
            }

            try {
                // ── Option 2: set an impossible filter so 0 rows show ──
                const oRowBinding = oTable.getRowBinding
                    ? oTable.getRowBinding()
                    : oTable.getBinding("rows") || oTable.getBinding("items");

                if (oRowBinding && typeof oRowBinding.filter === "function") {
                    const { Filter } = sap.ui.require(["sap/ui/model/Filter"]);
                    oRowBinding.filter(
                        new Filter("Country", "EQ", "__CLEAR__")  // value that will never match
                    );
                    console.log("[ConfigCols] Table cleared via dummy filter");
                }

            } catch (e) {
                console.warn("[ConfigCols] dummy filter failed:", e);
            }
        },

        /* ─────────────────────────────────────────────
         *  Lectura del filtro País
         * ───────────────────────────────────────────── */

        _getSelectedCountry: function () {
            const oFilterBar = this._getFilterBarV4();
            if (!oFilterBar) {
                return null;
            }

            // Método V4: getConditions() devuelve un map propertyName -> conditions[]
            try {
                if (typeof oFilterBar.getConditions === "function") {
                    const oConditions = oFilterBar.getConditions();
                    console.log("[ConfigCols] getConditions():", oConditions);

                    if (oConditions && oConditions.Country && oConditions.Country.length > 0) {
                        // Cada condition tiene { operator, values: [...] }
                        const oCondition = oConditions.Country[0];
                        if (oCondition.values && oCondition.values.length > 0) {
                            return oCondition.values[0];
                        }
                    }
                }
            } catch (e) {
                console.warn("[ConfigCols] getConditions falló:", e);
            }

            // Fallback: getFilterConditions de la TableAPI
            try {
                const oTable = this._getTableV4();
                if (oTable && typeof oTable.getFilterConditions === "function") {
                    const oFC = oTable.getFilterConditions();
                    console.log("[ConfigCols] table.getFilterConditions():", oFC);
                    if (oFC && oFC.Country && oFC.Country.length > 0) {
                        return oFC.Country[0].values[0];
                    }
                }
            } catch (e) { 
                console.warn("[ConfigCols] getFilterConditions falló:", e);
            }

            return null;
        },

        /* ─────────────────────────────────────────────
         *  Aplicación de visibilidad
         * ───────────────────────────────────────────── */

        _applyColumnVisibilityByCountry: function () {
            try {

                const sCountry = this._getSelectedCountry();
                console.log("[ConfigCols] País detectado:", sCountry);

                if (!sCountry) {
                    this._setAllColumnsVisible(true);
                    return;
                }

                const aVisibleColumns = COLUMN_VISIBILITY_BY_COUNTRY[sCountry];

                if (!aVisibleColumns) {
                    console.log("[ConfigCols] País sin mapeo:", sCountry);
                    this._setAllColumnsVisible(true);
                    return;
                }

                console.log("[ConfigCols] Aplicando visibilidad para", sCountry, ":", aVisibleColumns);

                ALL_CONTROLLABLE_COLUMNS.forEach((sColumnName) => {

                    const bVisible  = aVisibleColumns.includes(sColumnName);
                    const iIndex    = aVisibleColumns.indexOf(sColumnName);
                    const oMdcTable = this._getTableV4();
                    let oCol        = oMdcTable.getColumns().find(oColProp => oColProp.getDataProperty() === sColumnName);

                    if (bVisible) {

                        if (!oCol) {
                            oCol = this._oHiddenColumns[sColumnName]; // recover hidden column
                            delete this._oHiddenColumns[sColumnName]; // clean up storage
                        }

                        if (oCol) {
                            oMdcTable.removeColumn(oCol);
                            oMdcTable.insertColumn(oCol, iIndex);
                        }

                    } else {

                        if (oCol) {
                            this._oHiddenColumns[sColumnName] = oCol; 
                            oMdcTable.removeColumn(oCol);
                        }
                    }
                });

            } catch (oError) {
                console.error("[ConfigCols] Error:", oError);
            }
        },

        _applyRowsSelection: function () {

            // ── After GO → wait for data → select all ────
            var oMdcTable   = this._getTableV4();
            var oRowBinding = oMdcTable?.getRowBinding();

            if (!oRowBinding) return;

            oRowBinding.attachEventOnce("dataReceived", function () {

                setTimeout(function () {  // small delay so rows render

                    // var oInnerTable = this.base.byId("fe::table::ZCEFIAR018E_RISK_CENTER_RPT::LineItem-innerTable");
                    var oRowBinding = this._getTableV4().getRowBinding();
                    var iTotalCount = oRowBinding.getContexts().length;
                    console.log("[ConfigCols] Total rows to select:", iTotalCount);

                    oRowBinding.getContexts().forEach(ctx => {
                        const oRow    = ctx.getObject();
                        ctx.bSelected = oRow.AgingDays !== 1;
                    });

                }.bind(this), 200);

            }.bind(this));
        },

        _setColumnVisibility: function (sColumnName, bVisible) {

            const oTable = this._getTableV4();

            if (!oTable) {
                console.warn("[ConfigCols] Tabla MDC no encontrada");
                return;
            }

            const aColumns = oTable.getColumns();
            const oColumn  = aColumns.find((oCol) => {
                const sColumField = oCol.getId().endsWith("::"    + sColumnName) ||
                                    oCol.getId().endsWith("::C::" + sColumnName);
                return sColumField;
            });

            if (oColumn) {

                oColumn.setVisible(bVisible);
                this._setInnerColumnVisibility(oTable, oColumn, sColumnName, bVisible);
                // console.log(`[ConfigCols]   ${sColumnName} -> visible=${bVisible}`);
            } else {
                console.warn("[ConfigCols] Columna no encontrada:", sColumnName);
            }
        },

        _resolveInnerTable: function (oMdcTable) {
            // 1. Private property — fastest, works on most SAPUI5 versions
            if (oMdcTable._oTable &&
                (oMdcTable._oTable.isA("sap.m.Table") ||
                    oMdcTable._oTable.isA("sap.ui.table.Table"))) {
                console.log("[ConfigCols] Inner table via _oTable");
                return oMdcTable._oTable;
            }

            // 2. Known aggregation names used across different SAPUI5/FE versions
            var aAggNames = ["_content", "content", "_table", "table", "_inner"];
            for (var i = 0; i < aAggNames.length; i++) {
                var oCand = oMdcTable.getAggregation(aAggNames[i]);
                if (oCand && (oCand.isA("sap.m.Table") || oCand.isA("sap.ui.table.Table"))) {
                    console.log("[ConfigCols] Inner table via aggregation '" + aAggNames[i] + "'");
                    return oCand;
                }
            }

            // 3. Deep recursive walk — catches any wrapping layer
            //    (e.g. FE wraps MDC Table inside a VBox or Panel)
            var oFound = null;
            var fnWalk = function (oCtrl) {
                if (!oCtrl || oFound) return;
                if (oCtrl.isA("sap.m.Table") || oCtrl.isA("sap.ui.table.Table")) {
                    oFound = oCtrl;
                    return;
                }
                // Iterate all named aggregations
                var oMeta = oCtrl.getMetadata();
                var mAggregations = (oMeta && typeof oMeta.getAllAggregations === "function")
                    ? oMeta.getAllAggregations()
                    : {};
                Object.keys(mAggregations).forEach(function (sAgg) {
                    if (oFound) return;
                    try {
                        var vAgg = oCtrl.getAggregation(sAgg);
                        if (!vAgg) return;
                        if (Array.isArray(vAgg)) {
                            vAgg.forEach(fnWalk);
                        } else {
                            fnWalk(vAgg);
                        }
                    } catch (e) { /* some aggregations throw — ignore */ }
                });
            };
            fnWalk(oMdcTable);

            if (oFound) {
                console.log("[ConfigCols] Inner table via deep walk:", oFound.getMetadata().getName());
            }
            return oFound;
        },

        _setInnerColumnVisibility: function (oMdcTable, oMdcColumn, sColumnName, bVisible) {

            try {

                var oInnerTable = this._resolveInnerTable(oMdcTable);

                if (!oInnerTable) {
                    console.warn("[ConfigCols] Inner table not found for column:", sColumnName);
                    return;
                }

                // ── ResponsiveTable (sap.m.Table) ────────────────────────────
                if (oInnerTable.isA("sap.m.Table")) {
                    var aInnerColumns = oInnerTable.getColumns();

                    // Match inner column by header text or by index alignment with MDC columns
                    // The most robust way: match by index within the MDC columns array
                    var aMdcCols = oMdcTable.getColumns();
                    var iMdcIndex = aMdcCols.indexOf(oMdcColumn);

                    if (iMdcIndex >= 0 && iMdcIndex < aInnerColumns.length) {
                        aInnerColumns[iMdcIndex].setVisible(bVisible);
                        console.log("[ConfigCols]   inner sap.m.Column[" + iMdcIndex + "] -> visible=" + bVisible);
                    } else {
                        // Fallback: try to match by column header label text
                        var sLabel = (typeof oMdcColumn.getHeader === "function")
                            ? oMdcColumn.getHeader()
                            : sColumnName;

                        aInnerColumns.forEach(function (oInnerCol) {
                            var oHeader = oInnerCol.getHeader();
                            if (oHeader && typeof oHeader.getText === "function" &&
                                oHeader.getText() === sLabel) {
                                oInnerCol.setVisible(bVisible);
                                console.log("[ConfigCols]   inner sap.m.Column (by label '" + sLabel + "') -> visible=" + bVisible);
                            }
                        });
                    }

                    return;
                }

                // ── Grid/Analytical Table (sap.ui.table.Table) ──────────────
                if (oInnerTable.isA("sap.ui.table.Table")) {

                    var aInnerCols = oInnerTable.getColumns();
                    var aMdcColsGrid = oMdcTable.getColumns();

                    var iIdx = aMdcColsGrid.indexOf(oMdcColumn);

                    if (iIdx >= 0 && iIdx < aInnerCols.length) {
                        aInnerCols[iIdx].setVisible(bVisible);
                        console.log("[ConfigCols]   inner sap.ui.table.Column[" + iIdx + "] -> visible=" + bVisible);
                    }
                }

            } catch (e) {
                console.warn("[ConfigCols] _setInnerColumnVisibility error for '" + sColumnName + "':", e);
            }
        },

        _setAllColumnsVisible: function (bVisible) {
            ALL_CONTROLLABLE_COLUMNS.forEach((sColumnName) => {
                this._setColumnVisibility(sColumnName, bVisible);
            });
        }
        
    });
});
