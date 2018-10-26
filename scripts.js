$( "#search" ).click(function() {  // animate the settings cog onclick
    let flightCode = $('#search-bar').val();
    let reg = /([A-Za-z][A-Za-z]?[A-Za-z])([0-9]{1,4})/;

    if ( !(matchExact(reg, flightCode)) ) {  // check to prevent invalid flight codes
        alert('The format for the flight code is invalid.');
        return false;
    }

    if ( !(dateValidation($('#datepicker').val())) ) {  // check to prevent invalid date inputs
        alert('The format for the date is invalid.');
        return false;
    }

    let fullDate = $('#datepicker').datepicker('getDate');
    let airlinePrefix = flightCode.match(reg)[1];
    let flightNumber = flightCode.match(reg)[2]
    let month = parseInt(fullDate.getMonth())+1;
    let day = fullDate.getDate();
    let year = fullDate.getFullYear();
    let requestUrl = 'https://api.flightstats.com/flex/schedules/rest/v1/json/flight/' + airlinePrefix + '/' + flightNumber + '/departing/'+ year + '/' + month + '/' + day;
    let params = jQuery.param({
        appId: config.appId,
        appKey: config.apiKey
    });
    requestUrl = 'https://cors.io/?' + requestUrl + '?' + params;
    console.log(requestUrl);

    $.getJSON(requestUrl, function(json) {
        console.log(json);
        // todo handle requests with no scheduled flights
        // todo handle multiple scheduled flights
        let flight = json['scheduledFlights'][0];
        let arrivalAirportCode = flight["arrivalAirportFsCode"];
        let departureAirportCode = flight["departureAirportFsCode"];
        let departureTime = flight['departureTime'];
        let arrivalTime = flight['arrivalTime'];
        $(".arrive .airport-code").text(arrivalAirportCode); // set departing airport code
        $(".depart .airport-code").text(departureAirportCode);  // set arriving airport code
        let airlinePrefix = json['request']['carrier']['fsCode'];
        let flightNumber = json['request']['flightNumber']['interpreted'];
        let airlines = json['appendix']['airlines'];
        // todo add travel time to header
        let departureAirport = findEntity(departureAirportCode, json['appendix']['airports']);
        let arrivalAirport = findEntity(arrivalAirportCode, json['appendix']['airports']);
        $(".arrive .airport-name").text(departureAirport['name']);
        $(".depart .airport-name").text(arrivalAirport['name']);
        let departureTimezone = departureAirport['timeZoneRegionName'];
        // let arrivalTimezone = arrivalAirport['timeZoneRegionName'];
        departureTime = moment(departureTime);
        arrivalTime = moment(arrivalTime);
        let localDepartureTime = departureTime.format('h:mm A');
        let localArrivalTime = arrivalTime.format('h:mm A'); // fix timezone conversion
        $(".depart .time-value").text(localDepartureTime);
        $(".arrive .time-value").text(localArrivalTime);
        $(".depart .flight-date").text(departureTime.format('dddd, MMM. Do, YYYY'));
        $(".arrive .flight-date").text(arrivalTime.format('dddd, MMM. Do, YYYY'));
        let flightCode = airlinePrefix + flightNumber;
        let flightTime = moment.duration(arrivalTime.tz(departureTimezone).diff(departureTime));  // todo FIX THIS!!
        $("#results-detail-header").text(
            findEntity(airlinePrefix, airlines)['name'] + ' ' + airlinePrefix + flightNumber + ' ('+flightTime.get('hours')+'h '+flightTime.get('minutes')+'m)'
        );  // set table header
        $("#calendar-add").attr(
            "href",
            makeGoogleCalendarURL(
                flightCode,
                departureAirport['city'],
                arrivalAirport['city'],
                departureAirport['name'],
                localDepartureTime,
                localArrivalTime,
                departureTimezone,
                departureTime.format('YYYYMMDD[T]HHmmSS'),
                arrivalTime.tz(departureTimezone).format('YYYYMMDD[T]HHmmSS')
            )
        );
    });
});


function makeGoogleCalendarURL(code, fromCity, toCity, location, departTimeString, arriveTimeString, departTz, departTime, arrivalTime) {
    let urlString = "http://www.google.com/calendar/event?action=TEMPLATE&text=";
    urlString += encodeURI("Flight to ");
    urlString += encodeURI(toCity);
    urlString += encodeURI(" (");
    urlString += code;
    urlString += ")&dates=";
    urlString += departTime;
    urlString += "/"
    urlString += arrivalTime;
    urlString += encodeURI("&details=Departs at ")
    urlString += encodeURI(departTimeString)
    urlString += encodeURI(" (local time) from ")
    urlString += encodeURI(fromCity)
    urlString += encodeURI(", arrives at ")
    urlString += encodeURI(arriveTimeString)
    urlString += encodeURI(" (local time) in ")
    urlString += encodeURI(toCity)
    urlString += encodeURI("&location=")
    urlString += encodeURI(location)
    urlString += "&trp=false"
    urlString += "&ctz="
    urlString += encodeURI(departTz)
    return urlString;
}

function findEntity(itemCode, itemsList){
    return $.grep(itemsList, function(item){
        return item['fs'] == itemCode;
    })[0];  // only first result
};

function dateToGCalFormat(d) {
    return d.toISOString().replace(/-|:|\.\d\d\d/g,"");
}

function dateValidation(d) {
    return !!new Date(d).getTime();
}

function matchExact(r, str) {
    var match = str.match(r);
    return match != null && str == match[0];
}
