$( "#search" ).click(function() {  // animate the settings cog onclick
    let flightCode = $("#search-bar").val();
    let reg = /([A-Za-z][A-Za-z]?[A-Za-z])([0-9]{1,4})/;

    if ( !(matchExact(reg, flightCode)) ) {  // check to prevent invalid flight codes
        alert("The format for the flight code is invalid.");
        return false;
    }

    if ( !(dateValidation($("#datepicker").val())) ) {  // check to prevent invalid date inputs
        alert("The format for the date is invalid.");
        return false;
    }

    let fullDate = $("#datepicker").datepicker("getDate");

    let airlinePrefix = flightCode.match(reg)[1]; // parse flight code
    let flightNumber = flightCode.match(reg)[2]

    let month = parseInt(fullDate.getMonth())+1;  // requires an offset by 1
    let day = fullDate.getDate();
    let year = fullDate.getFullYear();
    let requestUrl = "https://api.flightstats.com/flex/schedules/rest/v1/json/flight/" + airlinePrefix + "/" + flightNumber + "/departing/"+ year + "/" + month + "/" + day;
    let params = jQuery.param({
        appId: config.appId,
        appKey: config.apiKey
    });
    requestUrl = "https://cors.io/?" + requestUrl + "?" + params;  // bypass CORS constraints via proxy

    $.getJSON(requestUrl, function(json) {
        // todo handle requests with no scheduled flights
        let flights = json["scheduledFlights"];

        $("#response-anchor").empty();

        $.each(flights, function(index, flight) {
            makeFlightTable(json, flight, index+1, flights.length);
        });

        $("#response-anchor div").fadeIn();
    });
});


function makeFlightTable(json, flight, index, lastFlight) {
    let arrivalAirportCode = flight["arrivalAirportFsCode"];
    let departureAirportCode = flight["departureAirportFsCode"];
    let departureTime = flight["departureTime"];  // in local time
    let arrivalTime = flight["arrivalTime"];  // in local time

    let airlinePrefix = json["request"]["carrier"]["fsCode"];
    let flightNumber = json["request"]["flightNumber"]["interpreted"];
    let airlines = json["appendix"]["airlines"];
    let departureAirport = findEntity(departureAirportCode, json["appendix"]["airports"]);
    let arrivalAirport = findEntity(arrivalAirportCode, json["appendix"]["airports"]);

    let departureTimezone = departureAirport["timeZoneRegionName"];
    let arrivalTimezone = arrivalAirport["timeZoneRegionName"];

    let flightDurationDiff = moment.tz(arrivalTime, arrivalTimezone).diff(moment.tz(departureTime, departureTimezone));
    let flightDurationString = moment.utc(flightDurationDiff).format("H[h] m[m]");

    departureTime = moment(departureTime);
    arrivalTime = moment(arrivalTime);

    let localDepartureTime = dateToMHString(departureTime);
    let localArrivalTime = dateToMHString(arrivalTime);
    let flightCode = airlinePrefix + flightNumber;


    // BUILD TABLE PROGRAMMATICALLY
    let tableContainer = $("<div>").attr("id", "response-"+index).attr("style", "display: none;");
    let tableRoot = $("<table>").addClass("results-detail");
    let tableHead = $("<thead>").append(
        $("<tr>").append(
            $("<th>").attr("id", "results-detail-header-"+index).attr("colspan", "2").append([
                $("<span>").addClass("flight-description").text(findEntity(airlinePrefix, airlines)["name"] + " " + airlinePrefix + flightNumber),
                " ",
                $("<span>").addClass("flight-duration-info").text("("+flightDurationString+")")
            ])
        )
    );

    let tableBody = $("<tbody>").append($("<tr>").append([
        $("<td>").addClass("depart").append(
            buildFlightDataTdHTML("Depart", "fa-plane-departure", departureAirport, departureTime)
        ),
        $("<td>").addClass("arrive").append(
            buildFlightDataTdHTML("Arrive", "fa-plane-arrival", arrivalAirport, arrivalTime)
        )
    ]));

    tableRoot.append(tableHead);
    tableRoot.append(tableBody);
    tableContainer.append(tableRoot);

    let addButton = $("<div>").addClass("calendar-add-container").append(
        $("<a>").attr("target", "_blank").attr(
            "href",
            makeGoogleCalendarURL(
                flightCode,
                departureAirport["city"],
                arrivalAirport["city"],
                departureAirport["name"],
                localDepartureTime,
                localArrivalTime,
                departureTimezone,
                dateToGCalFormat(departureTime),
                dateToGCalFormat(departureTime.add(moment.duration(flightDurationDiff).asSeconds(), "seconds"))
            )
        ).append(
            $("<button>").text("Add Flight to Calendar")
        )
    );

    tableContainer.append(addButton);
    if (index != lastFlight) {   // only add the divider if the flight is not the last
        tableContainer.append(
            $("<div>").addClass("plane-divider").addClass("response-divider").html("<i class=\"fas fa-plane\"></i>")
        );
    }
    $("#response-anchor").append(tableContainer);
}

function buildFlightDataTdHTML(headingName, iconName, airport, time) {
	// build the <td> element for either the arrival or departure sides of a given flight"s response information
    return makeTableHeading(headingName, iconName)
        .add($("<h1>").addClass("airport-code").text(airport["fs"]))
        .add($("<p>").addClass("airport-name").text(airport["name"]))
        .add($("<p>").addClass("flight-time").append(
            makeFlightTimeHTML(dateToMHString(time))
        ))
        .add($("<p>").addClass("flight-date").text(makeLongDateString(time)))
}

function makeTableHeading(headingName, iconName) {
    // make a table heading based off of a name (either "Arrival" or "Departure") and a FA icon name
    return $("<p>").addClass("table-heading").text(headingName).prepend(
        $("<i>").addClass("fas").addClass(iconName).addClass("flight-icon")
    );
}

function makeLongDateString(date) {
    // return a string in a format like: Monday, Oct. 29th, 2018
    return date.format("dddd, MMM. Do, YYYY");
}

function makeFlightTimeHTML(localTime) {
    // generated the HTML for the .flight-time field in either .depart or .arrive
    return $("<span>")
        .addClass("time-value")
        .text(localTime)
        .add(
            $("<span>").addClass("local-time").text("(local time)")
        );
}

function makeGoogleCalendarURL(code, fromCity, toCity, location, departTimeString, arriveTimeString, departTz, departTime, arrivalTime) {
    // builds and returns a url to Google Calendar for an event with the given parameters
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

function dateToMHString(date) {
    // returns the date, formatted in minutes and hours, with AM/PM offset. (i.e. 8:35 AM)
    return date.format("h:mm A")
}

function findEntity(itemCode, itemsList) {
    // finds a matching item from a list, based on a supplied item["fs"] attribute
    return $.grep(itemsList, function(item){
        return item["fs"] == itemCode;
    })[0];  // only first result
};

function dateToGCalFormat(d) {
    // format a date object into a string that can be supplied in a Google Calendar URL
    return d.toISOString().replace(/-|:|\.\d\d\d/g,"");
}

function dateValidation(d) {
    // check if a date is valid
    return !!new Date(d).getTime();
}

function matchExact(r, str) {
    // check if a regex pattern matches a string **exactly**
    var match = str.match(r);
    return match != null && str == match[0];
}
