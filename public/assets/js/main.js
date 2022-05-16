function getIRIParameterValue(requestedKey){
    let pageIRI = window.location.search.substring(1);
    let pageIRIVariables = pageIRI.split('&');
    for (let i = 0; i < pageIRIVariables.length; i++){
        let data = pageIRIVariables[i].split('=');
        if(data[0] == requestedKey){
            return data[1];
        }
    }
}

let username = getIRIParameterValue('username');
if(typeof username == 'undefined' || username === null){
    username = "Anomynous_" + Math.floor(Math.random()*1000);
}

$('#messages').prepend('<b>'+username+':</b>');