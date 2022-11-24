function errore(jqXHR, testStatus, strError) {
    if (jqXHR.status == 0)
        alert("Connection refused or Server timeout");
    else if (jqXHR.status == 200)
        alert("Formato dei dati non corretto : " + jqXHR.responseText);
    else
        alert("Server Error: " + jqXHR.status + " - " + jqXHR.responseText);
}

function inviaRichiesta(method, url, parameters = {}) {
    let contentType;
    if (method.toUpperCase() == "GET") {
        contentType = "application/x-www-form-urlencoded; charset=UTF-8"
    } 
	else {
        contentType = "application/json; charset=utf-8"
        parameters = JSON.stringify(parameters);
    }

    return $.ajax({
        url: url, //default: currentPage
        type: method,
        data: parameters,
        contentType: contentType,
        dataType: "json",
        timeout: 5000,
    });
}


function inviaRichiestaMultipart(method, url, formData){
    return $.ajax({
        url: url,
        type: method,
        data:formData,
		//queste tre impostazioni indicano ad $ajax
        // di non eseguire nessun azione sui parametri
		contentType:false,
		processData:false,
		cache:false,
		
        dataType: "json",
        timeout : 5000,
    });
}