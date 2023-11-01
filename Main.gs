/* ---------------------------------------- */
/* --- Setup ------------------------------ */
/* ---------------------------------------- */

/**
 * 1. "Admin SDK API"-tjänsten (id: AdminDirectory) måste läggas till i Google Apps Scripts-projektet.
 * 2. Ändra variablerna PATH, FIELD_NAME och CODE_STRING till era värden.
 * 3. Koppla en utlösare till trigger_daily()-funktionen för att köra scriptet automatiskt.
 */


/* ---------------------------------------- */
/* --- Variables -------------------------- */
/* ---------------------------------------- */

const PATH = `/`; // Var nånstans scriptet ska leta efter enheter.
const FIELD_NAME = `annotatedUser`; // Vilket fält som ska uppdateras. Mer info: https://developers.google.com/admin-sdk/directory/reference/rest/v1/chromeosdevices#ChromeOsDevice
const CODE_STRING = `000,0000,0000,0000,0000`; // Eran kodsträng.

const CUSTOMER_ALIAS = `my_customer`; // Kan ändras men behövs troligtvis inte göras.
const MAX_RESULTS = 100; // Kan ändras men behövs troligtvis inte göras.
const PROJECTION = `FULL`; // Kan ändras men behövs troligtvis inte göras.


/* ---------------------------------------- */
/* --- Trigger functions ------------------ */
/* ---------------------------------------- */

/**
 * Retrives all devices and updates each device containing an empty annotatedUser field with our kodsträng.
 * 
 * TRIGGER: Runs daily.
 */
function trigger_daily () {
  Main_();
}


/* ---------------------------------------- */
/* --- Functions -------------------------- */
/* ---------------------------------------- */

/**
 * Retrives all devices and updates each device containing an empty annotatedUser field with our kodsträng.
 */
function Main_ () {
  const devices = GetDevicesInOrgUnitPath_(PATH, true);

  if (!devices || devices.length === 0) return; // Exit the function if no devices were found.

  const filtered = devices.filter(device => !device[FIELD_NAME]); // Filter all found devices with no kodsträng.

  if (!filtered || filtered.length === 0) return; // Exit the function if no filtered devices were found.

  UpdateDeviceFields_(filtered, { [FIELD_NAME]: CODE_STRING });
}

/**
 * Retrives all Chromebooks in a specific OrgUnitPath.
 * https://developers.google.com/admin-sdk/directory/reference/rest/v1/chromeosdevices/list
 * 
 * Returns an array of objects of found Chromebooks including child OrgUnitPaths if includeChildOrgUnitPaths is set to true.
 * 
 * @param {string} orgUnitPath
 *     The full path of the organizational unit ("/" for the root, exclude any trailing /) or its unique ID.
 * @param {boolean=} includeChildOrgUnitPaths
 *     Return devices from all child orgunits, as well as the specified organizational unit.
 * 
 * @return {(object[]|null)}
 */
function GetDevicesInOrgUnitPath_ (orgUnitPath, includeChildOrgUnitPaths = true) {
  if (orgUnitPath === undefined || orgUnitPath === null) {
    throw new TypeError(`Param "OrgUnitPath" cannot be undefined or null.`);
  } else if (typeof orgUnitPath !== `string`) {
    throw new TypeError(`Param "OrgUnitPath" is not a string.`);
  } else if (orgUnitPath === ``) {
    throw new TypeError(`Param "OrgUnitPath" cannot be empty.`);
  }
  if (typeof includeChildOrgUnitPaths !== `boolean`) {
    throw new TypeError(`Param "IncludeChildOrgUnitPaths" is not a boolean.`);
  }

  try {
    let pageToken;
    let devices = [];

    do {
      const response = AdminDirectory.Chromeosdevices.list(CUSTOMER_ALIAS, {
        maxResults: MAX_RESULTS,
        projection: PROJECTION,
        orgUnitPath: orgUnitPath,
        includeChildOrgunits: includeChildOrgUnitPaths,
        pageToken: pageToken,
      });

      if (response.chromeosdevices && response.chromeosdevices.length > 0) {
        devices = devices.concat(response.chromeosdevices);
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return devices;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

/**
 * Update the fields of devices.
 * https://developers.google.com/admin-sdk/directory/reference/rest/v1/chromeosdevices/update
 * https://developers.google.com/admin-sdk/directory/reference/rest/v1/chromeosdevices#ChromeOsDevice
 * 
 * @param {object[]} devices
 *     The devices to run the operation on.
 * @param {object} fields
 *     Object with keys and values, acceptable keys are: annotatedAssetId, annotatedUser, annotatedLocation, and notes.
 */
function UpdateDeviceFields_ (devices, fields) {
  if (devices === undefined || devices === null) {
    throw new TypeError(`Param "Devices" cannot be undefined or null.`);
  } else if (!Array.isArray(devices)) {
    throw new TypeError(`Param "Devices" is not an array.`);
  } else if (devices && devices.length === 0) {
    throw new TypeError(`Param "Devices" cannot be empty.`);
  }
  if (fields === undefined || fields === null) {
    throw new TypeError(`Param "Fields" cannot be undefined or null.`);
  } else if (typeof fields !== `object`) {
    throw new TypeError(`Param "Fields" is not an object.`);
  } else if (Object.keys(fields).length === 0) {
    throw new TypeError(`Param "Fields" cannot be empty.`);
  }

  devices.forEach(device => {
    try {
      AdminDirectory.Chromeosdevices.update(fields, CUSTOMER_ALIAS, device.deviceId);

      Logger.log(`Device "${device.annotatedAssetId}" updated.`);
    } catch (error) {
      console.error(error.message);
      return;
    }
  });
}
