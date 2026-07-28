sap.ui.define([
    'sap/ui/core/mvc/ControllerExtension',
    'sap/m/MessageBox'
], function(ControllerExtension, MessageBox) {
    'use strict';

    return ControllerExtension.extend('argos.zffiar024e.ext.controller.GeneratePdfExt', {

         override: {
            onInit: function () {
                // sin inicializacion especial
            }
        },

        // ===========================================================
        // Handler del boton "Generar PDF"
        // ===========================================================

        generarPDF: function(oEvent) {
            console.log("[GeneratePdfExt] generarPDF invocado");

            let oExtensionAPI = this.base.getExtensionAPI();
            let oModel = oExtensionAPI.getModel();

            if (!oModel) {
                MessageBox.error("Modelo de datos no disponible.");
                return;
            }

            // 1. Leer filtros activos del FilterBar
            let oFilters = this._readFilterBarValues(oExtensionAPI);
            console.log("[GeneratePdfExt] filtros leidos:", oFilters);

            // 2. Validar parametros minimos
            if (!oFilters.SocMdte ) {  //|| !oFilters.CertDate
                MessageBox.warning(
                    "Debe ingresar Sociedad Mandante y Fecha de certificación antes de generar el PDF."
                );
                return;
            }

            // 3. Bind del bound action sobre la coleccion del entity set
            var sActionName = "com.sap.gateway.srvd.zsdfiar024e_cert_mdto.v0001.generarPDF";
            var oListBinding = oModel.bindList("/certifMdto");
            var oOperation = oModel.bindContext(
                sActionName + "(...)",
                oListBinding.getHeaderContext()
            );

            // 4. Pasar parametros (CertDate normalizada a formato ISO YYYY-MM-DD)
            oOperation.setParameter("SocMdtria", oFilters.SocMdtria);
            oOperation.setParameter("FiscalYear", oFilters.FiscalYear);
            oOperation.setParameter("FiscalPeriod", oFilters.FiscalPeriod);
            oOperation.setParameter("SocMdte", oFilters.SocMdte || "");
            oOperation.setParameter("CertDate", this._normalizeToIsoDate(oFilters.CertDate));
            oOperation.setParameter("Customer", oFilters.Customer || "");
            oOperation.setParameter("DocumentType", oFilters.DocumentType || "");

            // 5. Ejecutar action
            oOperation.execute().then(
                function () {
                    var oResult = oOperation.getBoundContext().getObject();
                    if (oResult && oResult.Attachment && oResult.FileName) {
                        this._downloadPDF(oResult);
                    } else {
                        MessageBox.error("La accion no devolvio un PDF valido.");
                    }
                }.bind(this),
                function (oError) {
                    console.error("[GeneratePdfExt] error:", oError);
                    MessageBox.error(
                        (oError && oError.message) ? oError.message : "Error al generar el PDF."
                    );
                }
            );
        },

        // ===========================================================
        // Helpers privados
        // ===========================================================

        _readFilterBarValues: function (oExtensionAPI) {

            var oResult = {};
            var oConditions = {};

            try {
                if (typeof oExtensionAPI.getFilterConditions === "function") {
                    oConditions = oExtensionAPI.getFilterConditions() || {};
                }

                if (Object.keys(oConditions).length === 0 &&
                    oExtensionAPI._controller &&
                    oExtensionAPI._controller.filterBarConditions) {
                    oConditions = oExtensionAPI._controller.filterBarConditions;
                }

                console.log("[GeneratePdfExt] conditions raw:", oConditions);

                oResult.SocMdtria = this._extractFirstValue(oConditions, "SocMdtria");
                oResult.FiscalYear = this._extractFirstValue(oConditions, "FiscalYear");
                oResult.FiscalPeriod = this._extractFirstValue(oConditions, "FiscalPeriod");
                oResult.SocMdte = this._extractFirstValue(oConditions, "SocMdte");
                oResult.CertDate = this._extractFirstValue(oConditions, "CertDate");
                oResult.Customer = this._extractFirstValue(oConditions, "Customer");
                oResult.DocumentType = this._extractFirstValue(oConditions, "DocumentType");
                
            } catch (e) {
                console.error("[GeneratePdfExt] error leyendo filtros:", e);
            }

            return oResult;
        },

        _extractFirstValue: function (oConditions, sProperty) {
            if (!oConditions || !oConditions[sProperty]) {
                return "";
            }
            var aConds = oConditions[sProperty];
            if (aConds.length > 0 && aConds[0].values && aConds[0].values.length > 0) {
                return aConds[0].values[0];
            }
            return "";
        },

        /**
         * Devuelve la fecha de hoy en formato ISO (YYYY-MM-DD).
         * Edm.Date de OData V4 requiere este formato.
         */
        _getTodayAsIsoDate: function () {
            var oNow = new Date();
            var sYear = String(oNow.getFullYear());
            var sMonth = String(oNow.getMonth() + 1).padStart(2, "0");
            var sDay = String(oNow.getDate()).padStart(2, "0");
            return sYear + "-" + sMonth + "-" + sDay;
        },

        /**
         * Normaliza cualquier valor de fecha a formato ISO YYYY-MM-DD.
         * Acepta: DATS (YYYYMMDD), ISO (YYYY-MM-DD), Date object, vacio.
         */
        _normalizeToIsoDate: function (vValue) {
            if (!vValue) {
                return this._getTodayAsIsoDate();
            }
            if (typeof vValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(vValue)) {
                return vValue;
            }
            if (typeof vValue === "string" && /^\d{8}$/.test(vValue)) {
                return vValue.substring(0, 4) + "-" + vValue.substring(4, 6) + "-" + vValue.substring(6, 8);
            }
            if (vValue instanceof Date) {
                var sYear = String(vValue.getFullYear());
                var sMonth = String(vValue.getMonth() + 1).padStart(2, "0");
                var sDay = String(vValue.getDate()).padStart(2, "0");
                return sYear + "-" + sMonth + "-" + sDay;
            }
            return this._getTodayAsIsoDate();
        },

        _downloadPDF: function (oResult) {
            try {
                var sBase64 = oResult.Attachment
                    .replace(/_/g, '/')
                    .replace(/-/g, '+');

                var sByteString = atob(sBase64);
                var aBytes = new Uint8Array(sByteString.length);
                for (var i = 0; i < sByteString.length; i++) {
                    aBytes[i] = sByteString.charCodeAt(i);
                }

                var oBlob = new Blob([aBytes], {
                    type: oResult.MimeType || 'application/pdf'
                });

                var sUrl = URL.createObjectURL(oBlob);

                // Abrir el PDF en una nueva pestaña del navegador
                var oNewWindow = window.open(sUrl, "_blank");

                if (!oNewWindow) {
                    // Si el browser bloquea pop-ups, fallback a descarga
                    var oLink = document.createElement("a");
                    oLink.href = sUrl;
                    oLink.download = oResult.FileName;
                    document.body.appendChild(oLink);
                    oLink.click();
                    document.body.removeChild(oLink);
                    MessageBox.warning(
                        "Su navegador bloqueó la apertura. El archivo se descargó: " + oResult.FileName
                    );
                } else {
                    // Liberar memoria después de unos segundos para que el browser cargue el PDF
                    setTimeout(function () {
                        URL.revokeObjectURL(sUrl);
                    }, 1000);
                }

            } catch (e) {
                MessageBox.error("Error al visualizar el archivo: " + e.message);
            }
        }

    });
});