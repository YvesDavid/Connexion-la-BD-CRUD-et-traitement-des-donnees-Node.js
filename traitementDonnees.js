module.exports = {  
    loadGeoJson,
    createJsonIntermediaire,
    clearMarkers, 
    addGoogleMarkerInJsonIntermedaire,
    saveToS3,
    saveGeoJson
};

const defaultGeoJson = require('./geoJson.json');
var afficherLesPoints = require("./afficherLesPoints");

var color_bunker = "#FFD700"; //...
var color_centralpath = "#FF4500"; // ..
var color_fairway = "#F22B0C"; //...
var color_green = "#0CF27F"; // ...
var color_water = "#2350CD"; // ...
var color_greencenter = "green-dot"; // .
var color_tees = "red-dot"; // .
var color_perimeter = "#711010"; // ...
var color_teebox = "pink-dot"; // .
var md5 = require('md5');

/*******************************************************
* CREATION DU JSON INTERMEDIAIRE
*******************************************************/
var AWS = require('aws-sdk');
AWS.config.credentials = new AWS.Credentials({
    accessKeyId: '*************', secretAccessKey: '*********************'
});

function fetchFromUrl(url, callback)
{
    fetch(url).then(function(response) {
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        return response.json();
    }).then(function(data) {
        return callback(data);
    }); 
}

function loadFromS3(courseId, callback)
{
    // Create unique bucket name
    var bucketName = '*******';    
    var s3 = new AWS.S3({ region: "eu-west-3", apiVersion: '2006-03-01'});
    // Create name for uploaded object key
    var file_id = md5(courseId);
    var filename = 'app/public/courses/' + file_id[0] + '/geo-' + file_id + '.geojson';
    var filenameEdited = 'app/public/courses/' + file_id[0] + '/geo-edited-' + file_id + '.geojson';
    const url_origin = "https://" + bucketName + ".s3.amazonaws.com/"+ filename;
    const url_edited = "https://" + bucketName + ".s3.amazonaws.com/"+ filenameEdited;
    // console.log(url_origin);
    
    var params = {
        Bucket: bucketName, 
        Key: filenameEdited, 
        IfNoneMatch: filename,
    };
    
    s3.headObject(params, function(err, data) {
        let url = err ||false ? url_origin : url_edited;
        fetchFromUrl(url, callback);
    });
}  


function saveToS3(courseId, geoJson)
{
    // Create unique bucket name
    var bucketName = '*******';
    // Create name for uploaded object key
    var file_id = md5(courseId);
    var filename = 'app/public/courses/' + file_id[0] + '/geo-edited-' + file_id + '.geojson';
    var s3 = new AWS.S3({ region: "eu-west-3"});
    s3.putObject({
        Bucket: bucketName,
        Key: filename,
        Body: JSON.stringify(geoJson),
        ContentType: "application/json",
        ACL:'public-read'},
        function (err,data) {
            if(err) {
                console.log("ERROR --- " + JSON.stringify(err) + " " + JSON.stringify(data));
            } else {
                alert("File is saved !");
            }
        }
        );
    }
    
    function loadGeoJson(courseId, callback)
    {
        if(!courseId)
        {
            callback(defaultGeoJson);
        } 
        else 
        {
            geoJson = loadFromS3(courseId, callback);
        }
    }
    
    function createJsonIntermediaire(geoJson)
    {
        var jsonIntermediaire = {};
        //Je viens de créer une clés dans mon jsonIntermediaire
        jsonIntermediaire["holes"] = {};
        jsonIntermediaire["extras"] = {};
        
        for (var i=0; i<geoJson["features"].length; i++){
            // on recupère le numero du trou // Pour tous les noms qui inclus "Hole " dans i
            if(geoJson["features"][i]["properties"]["name"].includes("Hole ")){
                //countSpaces correspond au nombre d'espaces presents dans le string
                var countSpaces = 0
                var numberHole = ""
                // j represente les caracteres des strings
                for( var j = 0; j<geoJson["features"][i]["properties"]["name"].length; j++){
                    if (countSpaces == 1){
                        numberHole += geoJson["features"][i]["properties"]["name"][j]
                    }
                    
                    if(geoJson["features"][i]["properties"]["name"][j] == " " ){
                        countSpaces += 1
                    }   
                }
                //on enleve le dernier espace enregistré dans le trou 
                numberHole = numberHole.substring(0, numberHole.length - 1)
                
                if(!jsonIntermediaire["holes"].hasOwnProperty("h"+numberHole)){
                    jsonIntermediaire["holes"]["h"+numberHole] = {}
                }
                
                // determine le type d'element golfique 
                var countSpaces = 0
                var typeElement = ""
                for( var j = 0; j<geoJson["features"][i]["properties"]["name"].length; j++){
                    if (countSpaces == 2){
                        typeElement += geoJson["features"][i]["properties"]["name"][j]
                    }
                    if(geoJson["features"][i]["properties"]["name"][j] == " " ){
                        countSpaces += 1
                    }   
                }
                //on enleve le dernier espace enregistré dans le trou 
                typeElement = typeElement.substring(0, typeElement.length - 1).toLowerCase().toString()
                if(!jsonIntermediaire["holes"]["h"+numberHole].hasOwnProperty(typeElement)){
                    jsonIntermediaire["holes"]["h"+numberHole][typeElement] = [] 
                }
                
                
                
                // Création des differents index de contenus 
                var jsonContent = {}
                switch (typeElement) {
                    case 'bunker':
                    jsonContent["marker_color"] = color_bunker
                    break
                    case 'centralpath':
                    jsonContent["marker_color"] = color_centralpath
                    break
                    case 'fairway':
                    jsonContent["marker_color"] = color_fairway
                    break
                    case 'green':
                    jsonContent["marker_color"] = color_green
                    break
                    case 'water':
                    jsonContent["marker_color"] = color_water
                    break
                    case 'greencenter':
                    jsonContent["marker_color"] = color_greencenter
                    break
                    case 'tee':
                    jsonContent["marker_color"] = color_tees
                    break
                    case 'perimeter':
                    jsonContent["marker_color"] = color_perimeter
                    break
                    case 'teebox':
                    jsonContent["marker_color"] = color_teebox
                    break
                }
                
                jsonContent["name"] = geoJson["features"][i]["properties"]["name"]
                jsonContent["coordinates"] = geoJson["features"][i]["geometry"]["coordinates"]
                jsonContent["type_marker"] = geoJson["features"][i]["geometry"]["type"]
                jsonContent["indexgeojson"] = i
                
                // var copy = jQuery.extend(true, {}, geoJson["features"][i]["geometry"])//creee un ojbet cloné
                
                
                if(typeof geoJson["features"][i]["geometry"]["coordinates"][0] == "number"){
                    jsonContent["coordinates_lat_lng"] = geoJson["features"][i]["geometry"]["coordinates"].slice().reverse()
                }
                else if(jsonContent["name"].includes("Centralpath")){
                    var array_reversed = []
                    for( var q=0; q < geoJson["features"][i]["geometry"]["coordinates"].length; q++){
                        
                        array_reversed.push(geoJson["features"][i]["geometry"]["coordinates"][q].slice().reverse())                   
                    }      
                    jsonContent["coordinates_lat_lng"] = [array_reversed]
                }
                else
                {
                    var array_reversed = []
                    for( var q=0; q < geoJson["features"][i]["geometry"]["coordinates"][0].length; q++){
                        array_reversed.push(geoJson["features"][i]["geometry"]["coordinates"][0][q].slice().reverse())                   
                    }      
                    jsonContent["coordinates_lat_lng"] = [array_reversed]
                }   
                jsonIntermediaire["holes"]["h" + numberHole][typeElement].push(jsonContent)
                
                
            }
            
            // on ajoute l'eau dans le json intermediaire
            if(geoJson["features"][i]["properties"]["name"].includes("Water"))
            {
                if(!jsonIntermediaire["extras"].hasOwnProperty("water"))
                {
                    jsonIntermediaire["extras"]["water"] = []
                }
                
                var jsonContent = {}
                
                jsonContent["name"] = geoJson["features"][i]["properties"]["name"]
                jsonContent["coordinates"] = geoJson["features"][i]["geometry"]["coordinates"]
                jsonContent["marker_color"] = color_water
                jsonContent["type_marker"] = geoJson["features"][i]["geometry"]["type"]
                jsonContent["indexgeojson"] = i
                
                var array_reversed = []
                for( var q=0; q < geoJson["features"][i]["geometry"]["coordinates"][0].length; q++){
                    array_reversed.push(geoJson["features"][i]["geometry"]["coordinates"][0][q].slice().reverse())                   
                }      
                jsonContent["coordinates_lat_lng"] = [array_reversed]
                
                jsonIntermediaire["extras"]["water"].push(jsonContent)
                
            }
        }
        return jsonIntermediaire;
    }
    
    
    function clearMarkers()
    {
        if (window.jsonIntermediaire===undefined){
        }
        else{
            for(key2 in window.jsonIntermediaire["holes"]){ // key recupere les clé h1 ....h18 et water
                let data = window.jsonIntermediaire["holes"][key2];
                for(key_holes_type_elements_3 in data){
                    for(element in data[key_holes_type_elements_3]){
                        if (data[key_holes_type_elements_3][element].hasOwnProperty("googleObject")){
                            data[key_holes_type_elements_3][element]["googleObject"].setMap(null);
                        }
                    }
                }
            }
            
            for(key2 in window.jsonIntermediaire["extras"]){ // key recupere les clé h1 ....h18 et water
                let data = window.jsonIntermediaire["extras"][key2];
                for(element in data){
                    if (data[element].hasOwnProperty("googleObject")){
                        data[element]["googleObject"].setMap(null);
                    }
                }
            }
        }
    }
    
    
    function addGoogleMarkerInJsonIntermedaire()
    {
        let jsonIntermediaire = window.jsonIntermediaire;
        for(key1 in jsonIntermediaire){// key1 les premiere clés holes et extras
            for(key2 in jsonIntermediaire[key1]){ // key recupere les clé h1 ....h18 et water
                if(key2 == "water"){// je gère le cas de l'eau 
                for(element in jsonIntermediaire[key1][key2]){ 
                    short_element = jsonIntermediaire[key1][key2][element]
                    var data_polygon = []
                    for(polygon in short_element["coordinates_lat_lng"][0]){
                        var pp = {"lat": short_element["coordinates_lat_lng"][0][polygon][0], "lng": short_element["coordinates_lat_lng"][0][polygon][1]}
                        data_polygon.push(pp)
                    }
                    var polygonobject = new google.maps.Polygon({
                        paths: data_polygon,
                        geodesic: true,
                        editable: true,
                        draggable : true,
                        strokeColor: short_element["marker_color"],
                        title: short_element["name"],
                        strokeOpacity: 1.0,
                        strokeWeight: 2,
                    }); 
                    short_element["googleObject"] = polygonobject
                }
                
            }else{// je gere les cas des trous 
                //pour(type des elements (fairway, tees ...))
                for(key_holes_type_elements_3 in jsonIntermediaire[key1][key2]){
                    //pour( chaque elements dans les type golfique) (jsonInter...[])
                    for(element in jsonIntermediaire[key1][key2][key_holes_type_elements_3]){ 
                        //short_element = [i] de type ( bunker, tees, center line )
                        short_element = jsonIntermediaire[key1][key2][key_holes_type_elements_3][element]
                        if(short_element["type_marker"] === "Point"){// les points 
                            
                            //créeons lavariable qui contiendra les coordonnées des polylines
                            // pour chaque objet(point) du tableau des coordonnées (short_element)
                            var pp = {"lat": short_element["coordinates_lat_lng"][0], "lng": short_element["coordinates_lat_lng"][1]}
                            
                            var MarkerObject = new google.maps.Marker({
                                position: pp,
                                geodesic: true,
                                editable: true,
                                strokeOpacity: 1.0,
                                strokeWeight: 2,
                                draggable: true,
                                title: short_element["name"],
                                icon:"https://maps.google.com/mapfiles/ms/icons/"+short_element["marker_color"]+".png"
                            });
                            
                            short_element["googleObject"] = MarkerObject
                            
                        }else if(short_element["type_marker"] == "Polygon"){// les polygon
                            var data_polygon = []
                            for(polygon in short_element["coordinates_lat_lng"][0]){
                                var pp = {"lat": short_element["coordinates_lat_lng"][0][polygon][0], "lng": short_element["coordinates_lat_lng"][0][polygon][1]}
                                data_polygon.push(pp)
                            }
                            var polygonobject = new google.maps.Polygon({
                                paths: data_polygon,
                                geodesic: true,
                                editable: true,
                                draggable : true,
                                strokeColor: short_element["marker_color"],
                                title: short_element["name"],
                                strokeOpacity: 1.0,
                                strokeWeight: 2,
                            }); 
                            
                            short_element["googleObject"] = polygonobject
                            
                        }else{// les lines
                            //créeons lavariable qui contiendra les coordonnées des polylines
                            var data_line_string = [] 
                            // pour chaque objet(point) du tableau des coordonnées (short_element)
                            for(point in short_element["coordinates_lat_lng"][0]){
                                var pp = {"lat": short_element["coordinates_lat_lng"][0][point][0], "lng": short_element["coordinates_lat_lng"][0][point][1]}
                                data_line_string.push(pp)
                            }
                            
                            var lineStringobject = new google.maps.Polyline({
                                path: data_line_string,
                                geodesic: true,
                                editable: true,
                                draggable : true,
                                strokeColor: short_element["marker_color"],
                                title: "okok",
                                strokeOpacity: 1.0,
                                strokeWeight: 2,
                            }); 
                            
                            short_element["googleObject"] = lineStringobject
                        }
                    } 
                }
            }
        }
    }
    return jsonIntermediaire;
}


function saveGeoJson()
{
    let jsonIntermediaire = window.jsonIntermediaire;
    let geoJson = window.geoJson;
    for(key1 in jsonIntermediaire)
    {
        if(key1 == "holes")
        {
            for(key2 in jsonIntermediaire[key1])
            {
                for(element in jsonIntermediaire[key1][key2])
                { 
                    for(index in jsonIntermediaire[key1][key2][element])
                    {
                        short_element = jsonIntermediaire[key1][key2][element][index]
                        coordinates = []
                        coordinates_lat_lng = {};
                        
                        if(short_element["type_marker"] == "Point"){
                            coordinates.push(short_element["googleObject"].getPosition().lng())
                            coordinates.push(short_element["googleObject"].getPosition().lat())
                            //
                            //         geoJson["features"].push(geoJson_Object)
                            
                        }else{
                            for(var j = 0; j < short_element["googleObject"].getPath().length; j++){
                                coordinates.push([short_element["googleObject"].getPath().getAt(j).lng(), short_element["googleObject"].getPath().getAt(j).lat()])
                            }
                            // On enregistre dans latlng 
                            
                        }
                        if(short_element["type_marker"] == "Point"){
                            coordinates_lat_lng = coordinates;
                        }else if(short_element["type_marker"] == "LineString") {
                            coordinates_lat_lng = coordinates;
                        }else{
                            coordinates_lat_lng = [coordinates];
                        }  
                        console.log(coordinates_lat_lng);
                        if(short_element.hasOwnProperty("is_new")){
                            //si l'element est nouveau, que faire 
                            geoJson_Object = {}
                            geoJson_Object["type"]="Feature"
                            geoJson_Object["geometry"] = {}
                            geoJson_Object["geometry"]["coordinates"] = coordinates_lat_lng
                            geoJson_Object["properties"]={}
                            geoJson_Object["properties"]["name"] = short_element["name"]
                            if(short_element["type_marker"] == "Point"){
                                geoJson_Object["properties"]["marker-color"] = color_green
                                geoJson_Object["geometry"]["type"]="Point"
                                if(geoJson_Object["properties"]["name"].includes("Tee ")){
                                    geoJson_Object["properties"]["marker-symbol"]="marker"
                                }
                                else{
                                    geoJson_Object["properties"]["marker-symbol"]="circle"
                                }
                            }else if(short_element["type_marker"] == "Polyline"){
                                geoJson_Object["geometry"]["type"]="LineString"
                                geoJson_Object["properties"]["stroke"] = "green"
                                geoJson_Object["properties"]["stroke-opacity"] = 1
                                geoJson_Object["properties"]["stroke-width"] = 1
                                
                            }else{
                                if(short_element["type_marker"] == "Polygon"){
                                    geoJson_Object["geometry"]["type"]="Polygon"
                                    geoJson_Object["properties"]["fill"] = "yellow"
                                    geoJson_Object["properties"]["fill-opacity"] = 0,5
                                    geoJson_Object["properties"]["stroke"] = "yellow"
                                    geoJson_Object["properties"]["stroke-width"] = 1
                                    geoJson_Object["properties"]["stroke-opacity"] = 0,5
                                }else{
                                }
                            }
                            
                            geoJson["features"].push(geoJson_Object)
                        }else{
                            geoJson["features"][short_element["indexgeojson"]]["geometry"]["coordinates"] = coordinates_lat_lng;
                        }
                    }
                }
            }
        }
    }
    let courseId = afficherLesPoints.getCourseId();
    saveToS3(courseId, geoJson);
}
/*******************************************************
* 
*******************************************************/

