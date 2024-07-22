"use strict";

function GoogleMapsApiError(response) {
    this.name = "GoogleMapsApiError";
    this.message = "The googleMapsApi responded with a non-OK status code \"" + response.status + "\".";
    this.response = response;
}

GoogleMapsApiError.prototype = new Error();
GoogleMapsApiError.prototype.constructor = GoogleMapsApiError;

module.exports = GoogleMapsApiError;
