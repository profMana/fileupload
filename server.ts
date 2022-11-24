// import base
import http from "http";
import url from "url";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";                // @types/express
import { MongoClient, ObjectId } from "mongodb";

// new
                                              // @types/express-fileupload
import fileUpload, { UploadedFile } from "express-fileupload";
import cors from "cors";                      // @types/cors
import cloudinary, { UploadApiResponse } from "cloudinary";       


// config
const PORT = process.env.PORT || 1337;
const connectionString: any = process.env.connectionString;
const DB_NAME = "5B";
const app = express();
dotenv.config({ path: ".env" });
cloudinary.v2.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET
});

declare global {
	namespace Express {
		interface Request {
			client : any  // ? means optional
		}
		interface Response {
			log : (err:any)=> any 
		}	
	}
}


// CORS
const whitelist = [
		"http://localhost:1337", 
		"https://localhost:1338", 
		"http://robertomana-upload.onrender.com",
		"https://robertomana-upload.onrender.com",			
        "http://localhost:4200"
];


/* ****************** Creazione ed Avvio del Server ************************ */
let server = http.createServer(app);
let paginaErrore: string = "";

server.listen(PORT, () => {
  init();
  console.log("Server in ascolto sulla porta " + PORT);
});

function init() {
    fs.readFile("./static/error.html", function(err:any, data:any) {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>"
    });
}








//****************************************************************
//elenco delle routes di tipo middleware
//****************************************************************
// 1.log 
app.use("/", function (req, res, next) {
	console.log("---->  " + req.method + ":" + req.originalUrl);
	next();
});

// 2.static route
//il next lo fa automaticamente quando non trova la risorsa
app.use("/", express.static("./static"));

// 3.route lettura parametri post
app.use("/", express.json({ "limit": "10mb" }));
app.use("/", express.urlencoded({"extended": true, "limit": "10mb"}));

// 4.log parametri
app.use("/", function (req, res, next) {
		if (Object.keys(req.query).length > 0) {
			console.log("Parametri GET: ", req.query);
		}
		if (Object.keys(req.body).length > 0) {
			// console.log("Parametri BODY: ", req.body);
		}
		next();
})

// 6. cors 
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin)
      return callback(null, true);
    if (whitelist.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not ' +
        'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    else
      return callback(null, true);
  },
  credentials: true
};
app.use("/", cors(corsOptions) as any);

// 7. binary upload
/*
app.use(fileUpload({
	"limits ": { "fileSize ": (10 * 1024 * 1024) }  // 10 MB
}));

*/


//****************************************************************
//elenco delle routes di risposta al client
//****************************************************************
// middleware di apertura della connessione
app.use("/api/", (req, res, next) => {
  MongoClient.connect(process.env.MONGODB_URI || connectionString, (err, client) => {
    if (err) {
		res.status(503).send("Db connection error");
    } 
	else {
		console.log("Connection made");
		req["client"] = client;
		next();
    }
  });
});

// listener specifici: 
app.get("/api/images", (req, res, next) => {
	let db = req["client"].db(DB_NAME) // as mongodb.Db;
	let collection = db.collection("images");
	let request = collection.find().toArray();
	request.then((data) => {
		res.send(data);
	});
	request.catch((err) => {
		res.status(503).send("Sintax error in the query");
	});
	request.finally(() => {
		req["client"].close();
	});
})


app.post("/api/uploadBinary", (req, res, next) => {
	if (!req.files || Object.keys(req.files).length == 0 || !req.body.username)
		res.status(400).send('Manca immagine o username');
	else {
		let file = req.files.img as UploadedFile;
		file.mv('./static/img/' + file["name"], function (err) {
			if (err)
				res.status(500).json(err.message);
			else {
				let db = req["client"].db(DB_NAME) // as mongodb.Db;
				let collection = db.collection("images");
				let user = {
				  "username": req.body.username,
				  "img": file.name
				}
				let request = collection.insertOne(user);
				request.then((data) => {
				  res.send(data);
				});
				request.catch((err) => {
				  res.status(503).send("Sintax error in the query");
				});
				request.finally(() => {
				  req["client"].close();
				});
			}
		})
	}
})


app.post("/api/uploadBase64", (req, res, next) => {
	let db = req["client"].db(DB_NAME) // as mongodb.Db;
	let collection = db.collection("images");
	let request = collection.insertOne(req.body);
	request.then((data) => {
		res.send(data);
	});
	request.catch((err) => {
		res.status(503).send("Sintax error in the query");
	});
	request.finally(() => {
		req["client"].close();
	});
})


app.post("/api/cloudinaryBase64", function (req, res, next) {
	cloudinary.v2.uploader.upload(req.body.img, { folder: "Ese03upload" })
	.catch((error) => {
		res.status(500).send("error uploading file to cloudinary")
	})
	.then((result: UploadApiResponse) => {
		let db = req["client"].db(DB_NAME) // as mongodb.Db;
		let collection = db.collection("images");
		let user = {
		  "username": req.body.username,
		  "img": result.secure_url
		}
		let request = collection.insertOne(user);
		request.then((data) => {
			res.send(data);
		});
		request.catch((err) => {
			res.status(503).send("Sintax error in the query");
		});
		request.finally(() => {
			req["client"].close();
		});
	})
})


app.post("/api/cloudinaryBinario", function (req, res, next) {
  if (!req.files || Object.keys(req.files).length == 0 || !req.body.username)
    res.status(400).send('Manca immagine o username');
  else {
    let file = req.files.img as UploadedFile;
    let path = './static/img/' + file["name"];
    file.mv(path, function (err) {
      if (err){
        res.status(500).json(err.message);
      }
      else {
        cloudinary.v2.uploader.upload(path, 
								{folder: "Ese03upload", use_filename: true} )
        .catch((error) => {
			res.status(500).send("error uploading file to cloudinary")
        })
        .then((result: UploadApiResponse) => {
			let db = req["client"].db(DB_NAME) // as mongodb.Db;
			let collection = db.collection("images");
			let user = {
				"username": req.body.username,
				"img": result.secure_url
			}
			let request = collection.insertOne(user);
			request.then((data) => {
				res.send(data);
			});
			request.catch((err) => {
				res.status(503).send("Sintax error in the query");
			});
			request.finally(() => {
				req["client"].close();
			});
        })
      }
    })
  }
})

//****************************************************************
//default route(risorse non trovate) e route di gestione degli errori
//****************************************************************
// 2 - default route
app.use('/', function (req, res, next) {
	res.status(404)
	if (req.originalUrl.startsWith("/api/")) {
		// se status != 200 mando una semplice stringa
		res.send("Risorsa non trovata");
		req["client"].close();
	}
	else  
		res.send(paginaErrore);
});


app.use("/", function (err, req, res, next) {
  console.log("***************  ERRORE CODICE SERVER ", err.message, "  *****************");
})

