$(document).ready(function() {
	
let txtUser = $("#txtUser")
let txtFile = $("#txtFile")

aggiornaTabella()

function aggiornaTabella() {
	let request = inviaRichiesta("GET", "/api/images")
	request.fail(errore)
	request.done(function(data) {
		let tbody = $("#mainTable").children("tbody")
		tbody.empty();
		for (let item of data) {
			let tr = $("<tr>").appendTo(tbody).addClass("text-center")
			$("<td>").appendTo(tr).text(item.username).css("font-size", "14pt")
				// se NON è un base64  e  NON è un cloudinary
			if (!item.img.toString().startsWith("data:image") &&
				!item.img.toString().startsWith("https://res.cloudinary.com"))
				item.img = "img/" + item.img;
			let img = $("<img>").prop("src", item.img).css("max-height", "60px")
			$("<td>").appendTo(tr).append(img)
		}
	})
}


$("#btnBinary").on("click", function() {
	let username = txtUser.val()	
	let file = txtFile.prop('files')[0]
	if (!username || !file) {
		alert("prego, inserire uno username e scegliere un file")
		return;
	}

	let formData = new FormData();
	formData.append('username', username);
	formData.append('img', file);

	let rq = inviaRichiestaMultipart("POST", "/api/uploadBinary", formData);
	rq.fail(errore)
	rq.done(function(data) {
		alert("upload eseguito correttamente")
		aggiornaTabella()
	})
});


$("#btnBase64").on("click", function() {
	inviaImmagineBase64()
})

async function inviaImmagineBase64(){
	let username = txtUser.val()	
	let file = txtFile.prop('files')[0]
	if (!username || !file) {
		alert("prego, inserire uno username e scegliere un file")
		return;
	}
    /*
	// utilizzo delle promise
	let request = resizeAndConvert1(file)
	request.catch(function(err) {
		alert(err.message)
	})
	request.then(function(base64data) {
		let rq = inviaRichiesta("POST", "/api/uploadBase64", 
		                              {"username":username, "img": base64data })
		rq.fail(errore)
		rq.done(function(data) {
			alert("upload eseguito correttamente")
			aggiornaTabella()
		})
	})
	*/
	// utilizzo di async / await
	let base64data = await resizeAndConvert(file)	
	let rq = inviaRichiesta("POST", "/api/uploadBase64", 
								  {"username":username, "img": base64data })
	rq.fail(errore)
	rq.done(function(data) {
		alert("upload eseguito correttamente")
		aggiornaTabella()
	})
}


$("#btnBase64Cloudinary").on("click", function() {
	let username = txtUser.val()	
	let file = txtFile.prop('files')[0]
	if (!username || !file) {
		alert("prego, inserire uno username e scegliere un file")
		return;
	}

	let reader = new FileReader();
	reader.readAsDataURL(file)
	reader.onload = function() {
		let rq = inviaRichiesta("POST", "/api/cloudinaryBase64",
		                           {"username":username, "img": reader.result })
		rq.fail(errore)
		rq.done(function(data) {
			alert("upload eseguito correttamente")
			aggiornaTabella()
		})
	}
})


$("#btnBinaryCloudinary").on("click", function() {
	let username = txtUser.val()	
	let file = txtFile.prop('files')[0]
	if (!username || !file) {
		alert("prego, inserire uno username e scegliere un file")
		return;
	}

	let formData = new FormData();
	formData.append('username', username);
	formData.append('img', file);

	let rq = inviaRichiestaMultipart("POST", "/api/cloudinaryBinario", formData);
	rq.fail(errore)
	rq.done(function(data) {
		alert("upload eseguito correttamente")
		aggiornaTabella()
	})
});


});



/* *********************** resizeAndConvert() ****************************** */
/* resize (tramite utilizzo della libreria PICA.JS) and base64 conversion    */

function resizeAndConvert(file) {
	/* step 1: lettura tramite FileReader del file binario scelto dall'utente.
			   File reader restituisce un file base64
	// step 2: conversione del file base64 in oggetto Image da passare alla lib pica
	// step 3: resize mediante la libreria pica che restituisce un canvas
				che trasformiamo in blob (dato binario di grandi dimensioni)
	// step 4: conversione del blob in base64 da inviare al server               */
	return new Promise(function(resolve, reject) {
		const WIDTH = 640;
		const HEIGHT = 480;
		let type = file.type;
		let reader = new FileReader();
		reader.readAsDataURL(file) // restituisce il file in base 64
			//reader.addEventListener("load", function () {
		reader.onload = function() {
			let img = new Image()
			img.src = reader.result // reader.result restituisce l'immagine in base64  						
			img.onload = function() {
				if (img.width < WIDTH && img.height < HEIGHT)
					resolve(reader.result);
				else {
					let canvas = document.createElement("canvas");
					if (img.width > img.height) {
						canvas.width = WIDTH;
						canvas.height = img.height * (WIDTH / img.width)
					} else {
						canvas.height = HEIGHT
						canvas.width = img.width * (HEIGHT / img.height);
					}
					let _pica = new pica()
					_pica.resize(img, canvas, {
							unsharpAmount: 80,
							unsharpRadius: 0.6,
							unsharpThreshold: 2
						})
						.then(function(resizedImage) {
							// resizedImage è restituita in forma di canvas
							_pica.toBlob(resizedImage, type, 0.90)
								.then(function(blob) {
									var reader = new FileReader();
									reader.readAsDataURL(blob);
									reader.onload = function() {
										resolve(reader.result); //base 64
									}
								})
								.catch(err => reject(err))
						})
						.catch(function(err) { reject(err) })
				}
			}
		}
	})
}
