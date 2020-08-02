const Discord = require('discord.js')
const {prefix, token} = require('./config.json');
const client = new Discord.Client();
const faltas = require('./faltas.json');
const birthdays = require ('./calendario.json');
const cumpleanosRegistrados = require ("./cumpleanosRegistrados.json");
const cumpleanosActivos = require("./cumpleanosActivos.json");
const fs = require('fs');
const List = require('collections/list');
const listaMuseo = require('./listaMuseo.json');
const canalesEscucha = new List([
    "329746149856641026", //la puerta
    "329750665012445204", //charla
    "545748056302157836", //charla 2
    "326113415678656514", //media
    "333879767893934082", //juegos
    "329461775093202944", //random
    "321088716024053760", //arte propio
    "408459488425672714", //texto voz
    "374933817464586241"  //config bots
]);
const meses = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}

/**
 * Cuando el bot envíe una señal de ready, actualizará el contador de usuarios y revisará faltas activas.
 */
client.on('ready', async () => {
    client.user.setActivity("Usa %help");
    client.guilds.forEach((guild) => {
        console.log(" - " + guild.name)
    })
    var artePropio = client.guilds.get('313808847120629770').channels.get('321088716024053760');
    await artePropio.fetchMessages( {limit: 50} )
        .then((mensajes) => {
            mensajes.forEach(mensaje => {
                artePropio.fetchMessage(mensaje);
            });
        });
    console.log("Ready!");
    actualizarContador();
    revisarFaltas();
})

/**
 * Al actualizar un usuario, se realizarán comprobaciones para el sistema de faltas y el sistema de artistas.
 */
client.on('guildMemberUpdate', (oldMember, newMember) =>{
    try{
        const guild = client.guilds.get("313808847120629770");
        const nuevoMiembro = guild.roles.find(rol => rol.id == "391619531342217217");
        const gatekeeper = guild.roles.find(rol => rol.id == "588845108129038396");
        const unaFalta = guild.roles.find(rol => rol.id == "391427555737075713");
        const dosFaltas = guild.roles.find(rol => rol.id == "391427712708771850");
	    const rolArtista = guild.roles.find(rol => rol.id == "338845441972109314");
        const canalFaltas = guild.channels.find(canal => canal.id == "524087175034306560");
        const bienvenida = guild.channels.find(canal => canal.id == "329746149856641026");
        const normas = guild.channels.find(canal => canal.id == "679045091188539413");
        const datos = guild.channels.find(canal => canal.id == "625719058352046111");
	    const canalArte = guild.channels.find(canal => canal.id == "321088716024053760");
        const canalCriticas= guild.channels.find(canal => canal.id == "622896774771900464");
        const faltaVC = guild.roles.find(rol => rol.id == "675773756244885504");

        if(oldMember.roles.length === newMember.roles.length){
            return; //Los roles no fueron actualizados.
        }
        //Sistema entrada
        
        if(oldMember.roles.find(rol => rol === nuevoMiembro) || oldMember.roles.find(rol => rol == gatekeeper)){
            if(!(newMember.roles.find(rol => rol === nuevoMiembro) || newMember.roles.find(rol => rol == gatekeeper))){
                console.log(`${newMember.user.tag} se ha unido al servidor.`);
                bienvenida.send(`Bienvenido, <@${newMember.id}>! por favor lee las <#${normas.id}> y las <#${datos.id}> del servidor! `);
            }
        }

        //Sistema faltas


        if(oldMember.roles.find(rol => rol === unaFalta)){
            if(!newMember.roles.find(rol => rol === unaFalta)){
                quitarFaltaRegistro(oldMember.id, unaFalta.id);
                console.log(`Se ha quitado el rol 1 falta a ${newMember.user.tag}.`);
                canalFaltas.send(`Se ha quitado el rol **1 falta** a ${newMember.user.tag}.`);
            }
            else if (newMember.roles.find(rol => rol === dosFaltas)){
                quitarFaltaRegistro(oldMember.id, unaFalta.id); //Se asignará el evento más abajo.
            }
        }

        if(oldMember.roles.find(rol => rol === dosFaltas)){
            if(!newMember.roles.find(rol => rol === dosFaltas)){
                quitarFaltaRegistro(oldMember.id, dosFaltas.id);
                console.log(`Se ha quitado el rol 2 faltas a ${newMember.user.tag}.`);
                canalFaltas.send(`Se ha quitado el rol **2 faltas** a ${newMember.user.tag}.`);
            }
            else if(newMember.roles.find(rol => rol === unaFalta)){
                quitarFaltaRegistro(oldMember.id, dosFaltas.id); //Se asignará el evento más abajo.
            }
        }

        if(newMember.roles.find(rol => rol === dosFaltas)){
            if(faltas[newMember.id] == undefined && !newMember.roles.find(rol => rol === unaFalta)){
                asignarFalta(oldMember, 2, canalFaltas);
                console.log(`Se ha asignado el rol **2 faltas** a ${newMember.user.tag}.`);
                canalFaltas.send(formatoFalta(dosFaltas, newMember))
            }
            
        }

        if(newMember.roles.find(rol => rol === unaFalta)){
            if(faltas[newMember.id] == undefined && !newMember.roles.find(rol => rol === dosFaltas)){
                asignarFalta(oldMember, 1, canalFaltas);
                console.log(`Se ha asignado el rol **1 falta** a ${newMember.user.tag}.`);
                canalFaltas.send(formatoFalta(unaFalta, newMember));
            }
            
        }

        if(newMember.roles.find(rol => rol === faltaVC)){
            if(!oldMember.roles.find(rol => rol === faltaVC)){
                asignarFalta(oldMember, 3/15, canalFaltas);
                console.log(`Se ha asignado el rol **Falta VC** a ${newMember.user.tag}.`);
                canalFaltas.send(formatoFalta(faltaVC, newMember));
            }
        }

	    //Sistema Artistas

        if(!oldMember.roles.find(rol => rol === rolArtista)){
            if(newMember.roles.find(rol => rol === rolArtista)){
                console.log(`${newMember.user.tag} ha obtenido el rol de artista.`);
                canalCriticas.send(`<@${newMember.id}> ahora tiene el rol ${rolArtista.name}!`);
            }
        }
    }
    catch(e){
        console.log(e);
    }
})

/**
 * Cuando un usuario sale del servidor, esta función lo quitará del sistema de cumpleaños, y actualizará el contador
 * de usuarios del servidor.
 */
client.on('guildMemberRemove', exMember => {

    try{
        //Sistema salida
        const guild = client.guilds.get("313808847120629770");
        const nuevoMiembro = guild.roles.find(rol => rol.id == "391619531342217217");
        const gatekeeper = guild.roles.find(rol => rol.id == "588845108129038396");
        const bienvenida = guild.channels.find(canal => canal.id == "329746149856641026");

        if(!(exMember.roles.find(rol => rol === nuevoMiembro) || exMember.roles.find(rol => rol == gatekeeper))){
            console.log(`${exMember.user.tag} ha dejado el servidor!`);
            bienvenida.send(`${exMember.user.tag} ha dejado el servidor!`);
        }

        //Sistema calendario
        eliminarCumpleanos(exMember.id);

        actualizarContador();
    }
    catch (e){
        console.log(e);
    }
})

/**
 * Cuando un miembro se una al servidor, el contador será actualizado.
 */
client.on('guildMemberAdd', member =>{

	const guild = client.guilds.get("313808847120629770");
        const rol = guild.roles.find(rol => rol.id == "689516296077049943");
	const rol2 = guild.roles.find(rol => rol.id == "690366608782131231");
        //const nuevoMiembro = guild.roles.find(rol => rol.id == "391619531342217217");
        //const gatekeeper = guild.roles.find(rol => rol.id == "588845108129038396");

    try{
        actualizarContador();
        guild.fetchMember(member.user.id).then(user => user.addRole(rol));
	guild.fetchMember(member.user.id).then(user => user.addRole(rol2));
	guild.fetchMember(member.user.id).then(user => user.addRole(nuevoMiembro));
	guild.fetchMember(member.user.id).then(user => user.addRole(gatekeeper));
    }
    catch(e){
        console.log(e);
    }
})

/**
 * Esta función se encarga de asignar una falta a un usuario.
 * @param {*} user - El usuario al cual se le aplicará la falta.
 * @param {*} falta - La severidad de la falta a aplicar.
 * @param {*} canalFaltas - El canal donde se anunciará la falta aplicada.
 */
function asignarFalta(user, falta, canalFaltas){

    if(faltas[user.id] != undefined){
        console.log("Se ha intentado asignar una falta, pero el usuario ya tenía una.");
        canalFaltas.send(`Se ha intentado asignar una falta, pero ${user.user.tag} ya tenía una. Remueva AMBOS roles y aplique la falta correspondiente.`);
        return;
    }

    let future = new Date();
    future.setUTCHours(0,0,0,0);
    future.setDate(future.getDate() + 15*falta);
    
    faltas[user.id] = future;
    guardarDatos();
}

/**
 * Esta función quitará la falta del archivo JSON y le quitará los roles al usuario enviado por parámetro.
 * @param {*} userID - La ID del usuario al cual se le quitará la falta.
 * @param {*} faltaParaRemover - La ID del rol de la falta a remover.
 * @param {*} faltaRespaldo - La ID del rol de la falta de respaldo.
 */
function quitarFaltaRegistro(userID, faltaParaRemover = "391427555737075713", faltaRespaldo = "391427712708771850"){
    const roles = ["391427555737075713", "391427712708771850"];
    client.guilds.get("313808847120629770").members.get(userID).removeRoles(roles);
    delete faltas[userID];
    guardarDatos();
}

/**
 * Esta función enviará un mensaje en el canal de faltas con información pertiente al castigo en el siguiente formato:
 * Falta: <Nombre de la falta>
 * Usuario: <Id, nombre y mención del usuario>
 * Fecha de implementación: <Fecha actual> [dd/mm/yyyy]
 * Fecha de finalización: <Fecha de expiración del castigo> [dd/mm/yyy]
 * @param {*} falta - La información de la falta.
 * @param {*} member - El usuario al cual se le aplicó la falta.
 */
function formatoFalta(falta, member){

    var nroFalta;
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + '/' + mm + '/' + yyyy;


    if(falta.id == "675773756244885504"){
        nroFalta = 0.2;
    }
    else{
        nroFalta = parseInt(falta.name.charAt(0))
    }

    let future = new Date();
    future.setUTCHours(0,0,0,0);
    future.setDate(future.getDate() + 15*nroFalta);
    var ddFuture = String(future.getDate()).padStart(2, '0');
    var mmFuture = String(future.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyyFuture = future.getFullYear();

    future = ddFuture + '/' + mmFuture + '/' + yyyyFuture;

    var mensaje = 
`Falta: ${falta.name}
Usuario: ${member.id} | ${member.user.tag} | <@${member.id}>
Fecha de implementación: ${today}
Fecha de finalización: ${future}`

    return mensaje;
}

/**
 * Guarda datos de las faltas en el archivo JSON.
 */
function guardarDatos(){
    let data = JSON.stringify(faltas, null, 2);
    fs.writeFileSync("./faltas.json", data);
}

/**
 * Al iniciar el sistema, se revisarán las faltas y los cumpleaños del día.
 */
var revisarFaltas = function(){
    console.log("Comprobando faltas...");
    var now = new Date();
    var future = new Date();
    future.setUTCHours(0,0,0,0);
    future.setUTCDate(now.getUTCDate() + 1);
    var counter = future - now + 10000; //+10s desfase
    var actualDate = now.toJSON();
    var faltasAux = faltas;
    for (const [key, value] of Object.entries(faltasAux)) {
      if(value == actualDate){
        quitarFaltaRegistro(key);
      }
    }

    //revisarCumpleanos();

    setTimeout(() => {
        relojFaltas();
        setInterval(relojFaltas, 86401000)
    }, counter);
}

/**
 * Revisa faltas y cumpleaños del día cada 24 horas.
 */
var relojFaltas = function() {
    console.log("Comprobando faltas...");
    var now = new Date();
    console.log(`Es un nuevo dia. ${now}`);
    now.setUTCHours(0,0,0,0);
    var actualDate = now.toJSON();
    var faltasAux = faltas;
    for (const [key, value] of Object.entries(faltasAux)) {
      if(value == actualDate){
        quitarFaltaRegistro(key);
      }
    }

    revisarCumpleanos();
}

/**
 * Actualiza el contador de miembros del servidor.
 */
function actualizarContador(){
    const guild = client.guilds.get("313808847120629770");
    const contMiembros = guild.channels.find(canal => canal.id == "638446506495705108");
    contMiembros.setName(`Miembros: ${guild.memberCount}`);
}

/**
 * Esta función se encarga del sistema starboard una vez detecta que se ha reaccionado a un mensaje.
 */
client.on('messageReactionAdd', async (messageReaction, user) =>{

    const guild = client.guilds.get("313808847120629770");
    //const museo = guild.channels.find(canal => canal.id == "374933817464586241"); //CONFIG BOTS
    const museo = guild.channels.find(canal => canal.id == "651134292658749445"); // museo -> starboard
    const artePropio = guild.channels.find(canal => canal.id == "321088716024053760");
    const canalEscucha = museo; //Debug only
    const msg = messageReaction.message;
    const reaction = messageReaction.emoji;
    var min = 10;

    if(msg.channel.id == artePropio.id){
        min = 15;
    }

    var existe = listaMuseo.find(function(mensaje) {
        return mensaje == msg.id;
    })

    if(user.bot //reaccion es de un bot
        || msg.author.bot //el mensaje es de un bot
        || existe //el mensaje ya está en museo
        || !canalesEscucha.has(msg.channel.id)) return; //no es un canal a escuchar
    var image = await resolveAttachment(msg)
    
     if(messageReaction.count >= min){
        var starMsg = new Discord.RichEmbed({
            color: 0xFDD744,
            author: {
                name: `${msg.author.username}#${msg.author.discriminator}`,
                icon_url: msg.author.avatarURL
            },
            description: `${msg.content}\n\n**[Ir al mensaje!](${msg.url})**`,
            timestamp: msg.createdAt
        });
        if (image != null){
    		if (msg.attachments.array().length > 0){
    			starMsg.setImage(msg.attachments.array()[0].proxyURL)
			var attachments = msg.attachments;
			var imagesURL = "";
    			var count = 1
			attachments.forEach(attachment =>{
				imagesURL = imagesURL + `\n[Archivo ${count}](${attachment.proxyURL})`
				count = count + 1
			})
			starMsg.description = `${msg.content}\n${imagesURL}\n**[Ir al mensaje!](${msg.url})**` 
    		}
    		else if (msg.embeds.length > 0){
    			starMsg.image = image
    		}
    		else{
    			starMsg.attachFiles(image)
    		}
   	}
        sentMsg = await museo.send(`El mensaje de ${msg.author} en <#${msg.channel.id}> llegó al <#${museo.id}>!`, starMsg);
        listaMuseo.push(msg.id);
        let regData = JSON.stringify(listaMuseo, null, 2);
        fs.writeFileSync("./listaMuseo.json", regData);
    }
})

/**
 * Resuelve el archivo adjunto del mensaje enviado por parámetro.
 * @param {*} msg - El mensaje a analizar.
 * @returns {(*|null)} - La imagen thumbnail, adjunta, o ninguna en caso de no tener.
 */
function resolveAttachment(msg) {
    if (msg.attachments.array().length > 0) {
        return msg.attachments.array()[0];
    } else if (msg.embeds.length > 0){
        if (msg.embeds[0].thumbnail != undefined){
            return msg.embeds[0].thumbnail;
        } else if (msg.embeds[0].image != null){
            return msg.embeds[0].image;
        }
    } else{
        return null;
    }
}

/**
 * Esta función se encarga de revisar los comandos enviados al bot.
 */
client.on('message', msg =>{
    
    const guild = client.guilds.get("313808847120629770");
    var bots = guild.channels.find(canal => canal.id == "313808847120629770");
    var configBots = guild.channels.find(canal => canal.id == "374933817464586241");

    if(msg.content.charAt(0) != prefix){
            return; //no es comando
    }
    if (!(msg.channel.id == bots.id || msg.channel.id == configBots.id)){
        return;
    }
    var contenidoMensaje = msg.content.substring(1, msg.content.length);
    var split = contenidoMensaje.split(" ");    

    switch (split[0]){
        case "agregar": //agregar Cumpleanos
            try{
                if(split[1].length != 5 || split[1].charAt(2) != "/"){
                    throw "Fecha no valida <dd/mm>"; //Lanzar excepcion (fecha no valida <dd/mm>)
                }
                var diaString = split[1].substring(0, 2);
                var mesString = split[1].substring(3, 5);
                //En caso de fecha no valida lanza una excepcion aqui
                var dia = parseInt(diaString);
                var mes = birthdays[parseInt(mesString) - 1];
                eliminarCumpleanos(msg.author.id); //borra entrada anterior (si existe)
                mes[dia].push(msg.author.id);
                cumpleanosRegistrados[msg.author.id] = split[1];
                let data = JSON.stringify(birthdays, null, 2);
                fs.writeFileSync("./calendario.json", data);
                let regData = JSON.stringify(cumpleanosRegistrados, null, 2);
                fs.writeFileSync("./cumpleanosRegistrados.json", regData);
                console.log(`Agregado cumpleaños en ${diaString}/${mesString}`)
                msg.channel.send(`Agregado cumpleaños en ${diaString}/${mesString}`)
                break;
            } catch (e){
                msg.channel.send("Verifica la fecha e intenta nuevamente.");
                console.log(e)
                break;
            }
        case "mostrar": //mostrar cumpleanos en x mes
            try{
                var mesString = split[1];
                var mesInt = parseInt(mesString) - 1; //Input enero: 01 -> 00 (array pos)
                var mes = birthdays[mesInt];
                if(mes == undefined) throw "Mes no valido";
                mostrarCalendario(mes, mesInt, msg);
                break;
            } catch (e)
            {
                console.log(e);
                msg.channel.send("Verifica el mes e intenta nuevamente.");
                break;
            }
        case "help":
            var help = new Discord.RichEmbed({
                title: `Comandos del bot:`,
                description : 
                    `**agregar**: Agrega un cumpleaños al registro. Uso: **${prefix}ac dd/mm**, donde dd es el día y mm el mes.\n
                     **mostrar**: Muestra los cumpleaños del mes seleccionado. Uso: **${prefix}mostrar mm**, donde mm es el mes.\n
                     **borrar**: Borra tu cumpleaños registrado.\n
                     **help**: Muestra este menú. Uso: **${prefix}help**`
            });
            msg.channel.send("", help);
            break;
        case "borrar":
            eliminarCumpleanos(msg.author.id);
            msg.channel.send("Ya no estás en el registro.");
            break;
        default:
            msg.channel.send(`No se reconoce el comando ${split[0]}`);
    }
    
})

client.on('messageDelete', async msg =>{

	if(msg.author.bot) return;
    	const guild = client.guilds.get("313808847120629770");
	var logChannel = guild.channels.find(canal => canal.id == "391633611956289537");
	var logChannelTest = client.guilds.get("548174478551810084").channels.find(canal => canal.id == "548197000873639966")
	var attachments = msg.attachments;
	var imagesURL = "";
        var count = 1
	attachments.forEach(attachment =>{
		imagesURL = imagesURL + `\n[Archivo ${count}](${attachment.proxyURL})`
		count = count + 1
	})


	const entry = await msg.guild.fetchAuditLogs({type: 'MESSAGE_DELETE'}).then(audit => audit.entries.first())
 	 let user = ""
   	 if (entry.extra.channel.id === msg.channel.id
   	   && (entry.target.id === msg.author.id)
   	   && (entry.createdTimestamp > (Date.now() - 5000))
  	    && (entry.extra.count >= 1)) {
 	   user = `${entry.executor.username}#${entry.executor.discriminator}`
 	 } else { 
 	   user = `${msg.author.username}#${msg.author.discriminator}`
 	 }

	var embed = new Discord.RichEmbed({
	    color: 0xFF0000,
            author: {
                name: `${msg.author.username}#${msg.author.discriminator}`,
                icon_url: msg.author.avatarURL
            },
            description: `Mensaje borrado en <#${msg.channel.id}> por ${user}:\n${msg.content}\n\n${imagesURL}`,
            timestamp: msg.createdAt,
            image: await resolveAttachment(msg)
    	});

    //logChannel.send("", embed)
    logChannelTest.send("", embed)
})
client.on('messageUpdate', async (oldMsg, newMsg) =>{

	if(oldMsg.author.bot) return;
	if(oldMsg.content == newMsg.content) return;
    	const guild = client.guilds.get("313808847120629770");
	var logChannel = guild.channels.find(canal => canal.id == "391633611956289537");
	var logChannelTest = client.guilds.get("548174478551810084").channels.find(canal => canal.id == "548197000873639966")

	var embed = new Discord.RichEmbed({
 	    color: 0xFFFF00,
            author: {
                name: `${oldMsg.author.username}#${oldMsg.author.discriminator}`,
                icon_url: oldMsg.author.avatarURL
            },
            description: `Mensaje editado en <#${oldMsg.channel.id}>:\nAntes:\n${oldMsg.content}\nAhora:\n${newMsg.content}`,
            timestamp: newMsg.createdAt,
            image: await resolveAttachment(newMsg)
    	});

    //logChannel.send("", embed)
    logChannelTest.send("", embed)
})

/**
 * Muestra los cumpleaños del mes solicitado en un mensaje RichEmbed.
 * @param {*} mes - El mes a analizar.
 * @param {*} mesInt - El número del mes a analizar (Rango 0-11).
 * @param {*} msg - El mensaje que contiene la solicitud del calendario.
 */
function mostrarCalendario(mes, mesInt, msg){
    var hayCumpleanosParaMostrar = false;
    var mostrar = new Discord.RichEmbed({
        title: `Cumpleaños en ${meses[mesInt + 1]}:`,
        description : ""
    });
    for(var dia in mes){
        var users = "";
        var nuevaDescripcion = mostrar.description;
        if (mes[dia].length > 0){
            hayCumpleanosParaMostrar = true;
            for(var i = 0; i < mes[dia].length; i++){
                users += `<@${mes[dia][i]}>`;
            }
            mostrar.description = `${mostrar.description}\n${dia}: ${users}`;
        }
    }
    if(!hayCumpleanosParaMostrar){
        mostrar.description = "No se han registrado cumpleaños en este mes.";
    }
    msg.channel.send("", mostrar);
}

/**
 * Elimina del archivo JSON el cumpleaños del usuario con la ID recibida.
 * @param {*} userID - La ID del usuario a borrar en el registro.
 */
function eliminarCumpleanos(userID){
    var fecha = cumpleanosRegistrados[userID];
    if (fecha == undefined) return; //No hay cumpleano registrado del usuario
    var diaString = fecha.substring(0, 2);
    var mesString = fecha.substring(3, 5);
    var dia = parseInt(diaString);
    var mes = birthdays[parseInt(mesString) - 1];
    mes[dia].splice(mes[dia].indexOf('foo'),1); //remover entrada del sistema
    delete cumpleanosRegistrados[userID];
}

/**
 * Esta función se encarga de adminsitrar los roles del los cumpleañeros, y anunciar sus cumpleaños.
 */
function revisarCumpleanos(){
    const guild = client.guilds.get("313808847120629770");
    const rolCumpleanos = guild.roles.find(rol => rol.id == "658505796560093204");
    const puerta = guild.channels.find(canal => canal.id == "329746149856641026");
    var date = new Date();
    var dia = date.getUTCDate();
    var mes = date.getUTCMonth();


    while(cumpleanosActivos.length > 0){ //remueve cumpleanos del dia anterior
        var userId = cumpleanosActivos.pop();
        guild.fetchMember(userId).then(user => user.removeRole(rolCumpleanos));
    }

    if(birthdays[mes][dia].length > 0){
        var users = "";
        for(var i = 0; i < birthdays[mes][dia].length; i++){
            var userId = `${birthdays[mes][dia][i]}`;
            users += `<@${userId}> `;
            guild.fetchMember(userId).then(user => user.addRole(rolCumpleanos));
            cumpleanosActivos.push(userId);
        }
        console.log(`Es el cumpleanos de ${users}`)
        puerta.send(`Es el cumpleaños de ${users}! 🎂`);
    }
    let data = JSON.stringify(cumpleanosActivos, null, 2);
    fs.writeFileSync("./cumpleanosActivos.json", data);
}
process.on('uncaughtException', err => {
    console.log(`Uncaught Exception: ${err.message}`)
  })
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, `reason: ${err.message}`)
  })
client.login(token);
