// argos/zfiar018e/zffiar018er/ext/fragment/Country.js
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";
    // ─── Visibility Rules ─────────────────────────────────────────────────────
    // Key = ComboBox selected key → fields to hide / show (must match PropertyPath exactly)
    const oVisibilityRules = {
        "CO": {
            hide: [""],
            show: ["CompanyCode", "CutoffDate", "Customer", "Rating"]
        }, // Colombia
        "DO": {
            hide: ["Rating"],
            show: ["CompanyCode", "CutoffDate", "Customer"]
        }, // Republica Dominicana
        "HN": {
            hide: ["Rating"],
            show: ["CompanyCode", "CutoffDate", "Customer"]
        }, // Honduras
        "PA": {
            hide: ["Rating", "CutoffDate"],
            show: ["CompanyCode", "Customer"]
        }, // Panama
    };


    // ─── Public API ───────────────────────────────────────────────────────────
    return {

        onSearch: function (sValue) {
            return new Filter({ path: "Country", operator: FilterOperator.EQ, value1: sValue });
        },

        /**
         * Called by the ComboBox 'selectionChange' event via core:require handler.
         * Hides/shows FilterBar fields defined in UI.SelectionFields annotation.
         *
         * @param {sap.ui.base.Event} oEvent
         */
        onCountryChange: function (oEvent) {

            const sSelectedKey = oEvent.getParameter("selectedItem")?.getKey() ?? "";
            const oComboBox    = oEvent.getSource();
            const oFilterBar   = _getFilterBar(oComboBox);

            if (!oFilterBar) {
                console.warn("[Country.js] FilterBar not found in control hierarchy.");
                return;
            }

            const oRules = oVisibilityRules[sSelectedKey];

            if (oRules) {

                oRules.hide.forEach(sProperty => _setFieldVisible(oFilterBar, sProperty, false));
                oRules.show.forEach(sProperty => _setFieldVisible(oFilterBar, sProperty, true));

                // Set required markers
               // ["CompanyCode", "CutoffDate", "Customer", "Rating"].forEach(
                //    sProperty => _setFieldRequired(oFilterBar, sProperty, oRules.show?.includes(sProperty))
              //  );

            } else {
                // Empty selection → hide ALL fields
                ["Customer", "CompanyCode", "CutoffDate", "Rating"].forEach(
                    sProperty => _setFieldVisible(oFilterBar, sProperty, false)
                );
            }

        }
    };

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Injects a value into the FilterBar's internal condition model
     * so that additionalBinding in CDS VH annotations can read it.
     *
     * @param {sap.ui.core.Control} oFilterBar
     * @param {string}              sPropertyPath  - CDS field name e.g. "Country"
     * @param {string}              sValue         - Selected value e.g. "CO"
     */
    function _setFilterCondition(oFilterBar, sPropertyPath, sValue) {

        const oModel      = oFilterBar.getModel("$filters");
        const oConditions = oModel?.getData()?.conditions;

        if (!oConditions) {
            console.warn("[Country.js] $filters model not found on FilterBar.");
            return;
        }

        if (sValue) {
            // Set EQ condition for the property
            oConditions[sPropertyPath] = [{
                operator  : "EQ",
                values    : [sValue],
                validated : "Valid"
            }];
        } else {
            // Clear condition when no country selected
            delete oConditions[sPropertyPath];
        }

        oModel.setData({ conditions: oConditions });
        oModel.refresh(true);
    };

    /**
     * Walk up the control tree until a FilterBar is found.
     *
     * @param   {sap.ui.core.Control} oControl
     * @returns {sap.ui.core.Control|null}
     */
    function _getFilterBar(oControl) {

        let oParent = oControl.getParent();

        while (oParent) {
            const sType = oParent.getMetadata().getName();
            if (sType.toLowerCase().includes("filterbar")) {
                return oParent;
            }
            oParent = oParent.getParent();
        }
        return null;
    };

    /**
     * Show or hide a filter field rendered from UI.SelectionFields.
     * sap.fe renders each PropertyPath as a FilterField with a stable ID:
     *   <filterBar.getId()>::<PropertyPath>
     *
     * @param {sap.ui.core.Control} oFilterBar
     * @param {string}              sPropertyPath  - Exact PropertyPath from annotation (e.g. "Customer")
     * @param {boolean}             bVisible
     */
    function _setFieldVisible(
        oFilterBar,
        sPropertyPath,
        bVisible) {

        // ── Build the ID using the exact pattern from your app ──────────────────
        const sFieldId = `${oFilterBar.getId()}::FilterField::${sPropertyPath}`;
        const oFilterField = sap.ui.getCore().byId(sFieldId);

        if (!oFilterField) {
            console.warn(`[Country.js] FilterField not found → tried id: ${sFieldId}`);
            return;
        }

        // Hide/show the field
        oFilterField.setVisible(bVisible);

        // Clear value when hiding to avoid ghost OData filters
        if (!bVisible) {
            if (oFilterField.setConditions) oFilterField.setConditions([]); // MDC FilterField
            if (oFilterField.setValue) oFilterField.setValue("");
        }
    };

    function _setFieldRequired(oFilterBar, sPropertyPath, bRequired) {

        const sFieldId     = `${oFilterBar.getId()}::FilterField::${sPropertyPath}`;
        const oFilterField = sap.ui.getCore().byId(sFieldId);

        if (!oFilterField) return;

        oFilterField.setRequired(bRequired);

    };

});
