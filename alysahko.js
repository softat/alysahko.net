//*** jakeluversio 29.8.2023 
//*** OHJEET: tallenna scripti shelly laitteeseen (luo uusi tai tallenna vanhan päälle) 
//**          laita scripti enabled -tilaan(käynnistyy bootissa) ja käynnistä scripti
//*** viimeisin muutos: tunnukseton käyttö

let sVersio = "3.8.29";
let omaStatus = "";

let paiva = "1.10.1971";
let tunnit = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
let tilat = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
let rankit = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
let hinnat = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
let kello = "99:99";
let tunti = "99";
let num = 99;
let ind = -1;
let tilaON = false;
let ajastin = null;
let ud = null;
let pvmVaihto = false;

let userID = "noname";

let netti = "https://213.186.230.34"; 

let laite = "";

function haeStatus() {
  let kayt = "";
  if (tunnit.length===tilat.length) {
    for (let t=0; t<tunnit.length; t++) { 
      if (tilat[t]===1) { kayt += JSON.stringify(tunnit[t]) +  "  "; } } }
        
  omaStatus = "tunti "+JSON.stringify(tunnit[ind])+
    ", hinta "+JSON.stringify(hinnat[ind])+
    ", rank "+JSON.stringify(rankit[ind])+
    ", tila "+JSON.stringify(tilat[ind])+", ON-tilan tunnit: "+kayt;
}

function tarkastaJaAsetaTila() {
  if (tilat[ind]===1) {
    if (!tilaON) {
      tilaON = true;
      print("tunti "+JSON.stringify(tunnit[ind])+" oli OFF, laitettiin ON"); 
      Shelly.call("switch.set",{ id:0,on:true },
        function (result,code,msg,ud) {}, null);
    }
  } else {
    if (tilaON) {
      tilaON = false;
      print("tunti "+JSON.stringify(tunnit[ind])+" oli ON, laitettiin OFF"); 
      Shelly.call("switch.set",{ id:0,on:false },
        function (result,code,msg,ud) {}, null);
    }
  }
}

function paivitahinnat(vastaus) {
  print("hintojen paivitys..") 
  let palaute = JSON.parse(vastaus);  
  let lkm = hinnat.length;
  if ((lkm>23) && (hinnat.length===palaute.hinnat.length)) {
    if (typeof (palaute.tunnus) === 'undefined') {
      print("ei omistajaa.."); 
    } else {
      if (userID!==palaute.tunnus) {
        print("oikea omistaja: ",palaute.tunnus); 
        userID = palaute.tunnus;
      }
    }
    print("Tallennetaan uudet hinnat");
	let ekapvm = palaute.hinnat[0]["paiva"];
    for (let i=0; i<lkm; i++) {
      if (palaute.hinnat[i]["paiva"]===ekapvm) {
        tilat[i] = palaute.hinnat[i]["tila"]; 
        rankit[i] = palaute.hinnat[i]["rank"];
        hinnat[i] = palaute.hinnat[i]["hinta"];
        print(palaute.hinnat[i]["kello"]+" : ",hinnat[i],", ",tilat[i]);
      }
    }
    print("asetetaan uudet tilat..");
    tarkastaJaAsetaTila();
      
    print("kuitataan tilamuutokset..");
    haeStatus();
    let urlViesti = netti+"/kuittaaTila/"+userID+"/"+laite.id+"/"+sVersio+"/"+omaStatus;
    Shelly.call("HTTP.GET", {url:urlViesti, timeout:10, ssl_ca:"*"},null,null);
  } else {
    print("pilvipalautteen lukum. ei vastaa ohjelmaa!!!");
  }
}

function paivitaAjastukset(vastaus) {
  let palaute = JSON.parse(vastaus);
  let hommaa = palaute["update"];
  if (hommaa===0) {
    if (typeof (palaute.tunnus) === 'undefined') {
      if (userID==="noname") {      
        print("Laitteella ei omistajaa. Kirjaudu ensin palveluun ja ",
         "valitse laite listallesi. Laitteen tunnus ",laite.id);
      } else {print("ei muutoksia");}
    } else {
      if (palaute.tunnus!=="noname") {
        if (userID!==palaute.tunnus) {
          print("oikea omistaja: ",palaute.tunnus); 
          userID = palaute.tunnus;
        } else {print("ei muutoksia");}
      } else {
        print("Laitteella ei omistajaa. Kirjaudu ensin palveluun ja ",
         "valitse laite listallesi. Laitteen tunnus ",laite.id);
        userID = "noname";
      }
    }
  } else {
    print("oli muutoksia, tallennetaan muistiin");
    let aset = palaute["valinnat"];
    let lkmA = aset.length;
    let lkmT = tilat.length;
    if (lkmA===lkmT) { 
      for (let i=0; i<lkmA; i++) { 
        tilat[i] = aset[i]["tila"];
        if (tilat[i]===1) { 
          print("aktivoitiin tunti ",aset[i]["tunti"]); 
        }
      }
      print("asetetaan uudet tilat..");
      tarkastaJaAsetaTila();
      
      print("kuitataan tilamuutokset..");
      haeStatus();
      let urlViesti = netti+"/kuittaaTila/"+userID+"/"+laite.id+"/"+sVersio+"/"+omaStatus;
      Shelly.call("HTTP.GET", {url:urlViesti, timeout:10, ssl_ca:"*"},null,null);
    }
  };
}

function haetunnit() {
  let urlViesti = netti+"/hinnatTanaan/"+userID+"/"+laite.id+"/"+sVersio;
  Shelly.call("HTTP.GET", {url:urlViesti,timeout:10,ssl_ca:"*"}, function (ud) {
    if (typeof (ud) === 'undefined') {print("tuntematon palaute");return false;}
    if (ud === null) {print("ei palautetta");return false; }
    if (typeof (ud.code) === 'undefined') {print("tuntematon palaute");return false;}
    if (ud.code === 201) {
      print("Laitteella ei omistajaa. Kirjaudu ensin palveluun ja valitse laite listallesi",
      ". Laitteen tunnus ",laite.id);
      return false;
    }
    if (ud.code === 200) {
      let okPalaute = ud.body;
      paivitahinnat(okPalaute);
    } else {
      print("virheellinen palaute");
      return false;
    }
  },null );
}

function suoritaAjastin() {
  print("suoritetaan ajastin..");
  if (laite==="") { laite = Shelly.getDeviceInfo(); }
  print("laite.id = ",laite.id);
  Shelly.call("Shelly.GetStatus", "", function (ud) { 
    kello = ud.sys.time; 
    tunti = kello.slice(0, 2); 
  }, null);

  if (tunti==="00" && !pvmVaihto) { 
    print("vuorokausi vaihtui. Nollataan rankit..");
    pvmVaihto = true; rankit[0] = 0; 
  }
  if (tunti==="23") { pvmVaihto = false; }

  num = JSON.parse(tunti);
  ind = num;
  if (num===99) {print("tuntitietoa ei viela saatu, odotetaan..");return false;}

  if (rankit[0]===0) { 
    print("hinnat alustamatta, haetaan tunnit.."); 
    haetunnit(); 
    return false; 
  } 

  haeStatus();
  print(omaStatus); 
    
  let urlViesti = netti+"/tarkistaTila/"+userID+"/"+laite.id+"/"+sVersio+"/"+omaStatus;
  print("tarkistetaan pilviasetusten tila..");
  Shelly.call("HTTP.GET", {url:urlViesti, timeout:10, ssl_ca:"*"}, function (ud) {
    if (typeof (ud) === 'undefined') {print("tuntematon palaute");return false;}
    if (ud === null) {print("ei palautetta");return false; }
    if (typeof (ud.code) === 'undefined') {print("tuntematon palaute");return false;}
    if (ud.code !== 200) {print("virheellinen palaute");return false;}
    let okPalaute = ud.body;
    paivitaAjastukset(okPalaute);
  },null );
  
  tarkastaJaAsetaTila();
}

print("Odotetaan ajastinta..");
ajastin = Timer.set(30000, true, suoritaAjastin, null);
