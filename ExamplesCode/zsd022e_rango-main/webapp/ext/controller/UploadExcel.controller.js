sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageToast',
	'sap/ui/core/message/Message',
	'sap/m/BusyDialog'
], function (ControllerExtension, MessageToast, Message, BusyDialog) {
	'use strict';

	const namespace = "com.sap.gateway.srvd.zsd_sd022e_rango.v0001.";

	return ControllerExtension.extend('argos.zsd022e.zsd022erango.ext.controller.UploadExcel', {

		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf argos.zsd022e.zsd022erango.ext.controller.UploadExcel
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				this.fileContent = null;
				this.fileName = null;
				this.fileType = null;
				this._oDialog = null;
				this._oBusyDialog = null;
			}
		},

		// On File Change
		onFileChange: function (oEvent) {
			var file = oEvent.getParameter("files")[0];
			if (file === undefined) {
				return;
			}

			this.fileType = file.type;
			this.fileName = file.name;

			var fileReader = new FileReader();

			var readFile = function (file) {
				return new Promise(function (resolve) {
					fileReader.onload = function (loadEvent) {
						resolve(loadEvent.target.result.match(/,(.*)$/)[1]);
					};
					fileReader.readAsDataURL(file);
				});
			};

			// FIX: bind(this) added so that 'this' refers to the controller instance
			readFile(file).then(function (result) {
				this.fileContent = result;
			}.bind(this));
		},

		// Perform upload
		onUploadPress: function (oEvent) {
			var oResourceBundle = this._getResourceBundle();

			if (!this.fileContent) {
				MessageToast.show(oResourceBundle.getText("uploadFileErrMsg"));
				return;
			}

			var oModel = this.base.getExtensionAPI().getModel();
			var oOperation = oModel.bindContext("/Rango/" + namespace + "uploadExcel(...)");
			var oDialog = this._oDialog;

			var fnCleanup = function () {
				this._getBusyDialog().close();
				oModel.refresh();
				if (oDialog) {
					oDialog.close();
					oDialog.destroy();
					this._oDialog = null;
				}
				var oFileUpload = sap.ui.getCore().byId("idFileUpload");
				if (oFileUpload) {
					oFileUpload.clear();
				}
				this.fileContent = null;
				this.fileName = null;
				this.fileType = null;
			}.bind(this);

			var fnSuccess = function (oResult) {
				var oContext = oOperation.getBoundContext();
				var oReturnValue = oContext.getObject();
				debugger;
				if (oReturnValue && oReturnValue.Filename !== "") {
					try {
						// Same approach as the TypeScript PDF example
						var sBase64 = oReturnValue.Attachment
							.replace(/_/g, '/')
							.replace(/-/g, '+');

						var sByteString = atob(sBase64);
						var aBytes = new Uint8Array(sByteString.length);
						for (var i = 0; i < sByteString.length; i++) {
							aBytes[i] = sByteString.charCodeAt(i);
						}

						var oBlob = new Blob([aBytes], { type: oReturnValue.Mimetype });
						var sUrl = URL.createObjectURL(oBlob);
						var oLink = document.createElement('a');
						oLink.href = sUrl;
						oLink.download = oReturnValue.Filename;
						document.body.appendChild(oLink);
						oLink.click();
						document.body.removeChild(oLink);
						URL.revokeObjectURL(sUrl);

						MessageToast.show(oResourceBundle.getText("uploadProcessCompleted"));

					} catch (e) {
						MessageToast.show(oResourceBundle.getText("downloadError") + e.message);
						console.error(e);
					}
				} else {
					MessageToast.show(oResourceBundle.getText("uploadFileSuccMsg"));
				}

				fnCleanup();
			}.bind(this);

			var fnError = function (oError) {
				this.base.editFlow.securedExecution(function () {
					var oMessageManager = sap.ui.getCore().getMessageManager();

					oMessageManager.addMessages(
						new Message({
							message: oError.message,
							target: "",
							persistent: true,
							type: "Error",
							code: oError.error.code
						})
					);

					var aErrorDetail = oError.error.details || [];
					aErrorDetail.forEach(function (error) {
						oMessageManager.addMessages(
							new Message({
								message: error.message,
								target: "",
								persistent: true,
								type: "Error",
								code: error.code
							})
						);
					});
				});
				fnCleanup();
			}.bind(this);

			oOperation.setParameter("Mimetype", this.fileType);
			oOperation.setParameter("Filename", this.fileName);
			oOperation.setParameter("Attachment", this.fileContent);
			// Close upload dialog first, then show busy
			if (oDialog) {
				oDialog.close();
			}
			// Show busy dialog just before executing
			this._getBusyDialog().open();
			oOperation.execute().then(fnSuccess, fnError);
		},

		uploadExcelDialog: function (oEvent) {
			this.base.getExtensionAPI().loadFragment({
				name: "argos.zsd022e.zsd022erango.ext.fragment.uploadFileDialog",
				type: "XML",
				controller: this
			}).then(function (oDialogResult) {
				// FIX: store dialog reference on the instance so upload handlers can close/destroy it
				this._oDialog = oDialogResult;
				this._oDialog.open();
			}.bind(this));
		},
		onCancelPress: function () {
			if (this._oDialog) {
				this._oDialog.close();
				this._oDialog.destroy();
				this._oDialog = null;
			}
			var oFileUpload = sap.ui.getCore().byId("idFileUpload");
			if (oFileUpload) {
				oFileUpload.clear();
			}
			this.fileContent = null;
			this.fileName = null;
			this.fileType = null;
		},
		// Helper to get or create BusyDialog
		_getBusyDialog: function () {
			if (!this._oBusyDialog) {
				var oResourceBundle = this._getResourceBundle();
				this._oBusyDialog = new BusyDialog({
					text: oResourceBundle.getText("busyDialogDEscription"),
					title: oResourceBundle.getText("busyDialogTilte")
				});
			}
			return this._oBusyDialog;
		},
		// Helper to get resource bundle safely
		_getResourceBundle: function () {
			return this.base.getView().getModel("i18n").getResourceBundle();
		}
	});
});