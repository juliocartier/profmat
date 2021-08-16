var http = require('http');
var fs = require('fs');
var path = require('path');
//var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport')




var app = express();

const PORT= process.env.PORT || 8080;

const { Pool } = require('pg')

//Conexão com o banco de dados
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '123',
    port: 5432,
  })

let transporter = nodemailer.createTransport(smtpTransport({    
	service: 'gmail',
	host: 'smtp.gmail.com',
	port: 465,
    secure: true, 
	auth: {        
		 user: 'calctarifas@gmail.com',        
		 pass: 'cartier94'    
	}
}));
  
  /*pool.query('SELECT * FROM accounts', (err, res) => {
    console.log(err, res) 
    pool.end() 
  })*/


// http.createServer(function (request, response) {
    
//     var filePath = '.' + request.url;
//     if (filePath == './') {
//         filePath = './index.html';
//     }

//     var extname = String(path.extname(filePath)).toLowerCase();
//     var mimeTypes = {
//         '.html': 'text/html',
//         '.js': 'text/javascript',
//         '.css': 'text/css',
//         '.json': 'application/json',
//         '.png': 'image/png',
//         '.jpg': 'image/jpg',
//         '.svg': 'image/svg+xml'
//     };

//     var contentType = mimeTypes[extname] || 'application/octet-stream';

//     fs.readFile(filePath, function(error, content) {
//         if (error) {
//             if(error.code == 'ENOENT') {
//                 fs.readFile('./404.html', function(error, content) {
//                     response.writeHead(404, { 'Content-Type': 'text/html' });
//                     response.end(content, 'utf-8');
//                 });
//             }
//             else {
//                 response.writeHead(500);
//                 response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
//             }
//         }
//         else {
//             response.writeHead(200, { 'Content-Type': contentType });
//             response.end(content, 'utf-8');
//         }
//     });

// }).listen(PORT);
// console.log('Server running at http://127.0.0.1:8080/');

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use(express.static("public"));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/login', function(request, response) {
	response.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/projeto', function(request, response) {
	response.sendFile(path.join(__dirname + '/index_projeto.html'));
});

app.post('/projeto', function(request, response) {
	var nome = request.body.nome;
	var email = request.body.email;
	var cidade = request.body.cidade;
	var nomeEscola = request.body.nomeEscola;
	var telefone = request.body.telefone; 
	var indicacao = request.body.indicacao;
	var messagem = request.body.messagem;

	console.log("Entrou aqui", nome, telefone, email, indicacao);

	var mailOptions = {
		from: 'calctarifas@gmail.com',
		to: 'juliocartier@gmail.com',
		subject: 'Sending Email using Node.js',
		text: 'That was easy!'
	  };

	  transporter.sendMail(mailOptions, function(error, info){
		if (error) {
		  console.log(error);
		} else {
		  console.log('Email sent: ' + info.response);
		}
	  });

});

app.get('/download', function(request, response) {
	response.download(__dirname + '/public/Template.doc');
});


app.post('/email', function(request, response) {

	     var email = request.body.email2;
         var assunto = request.body.assunto; 
         var messagem = request.body.messagem;

		 console.log("Entrou aqui", email, assunto, messagem);

     options
     const mailOptions = {
          from: 'juliocartier@gmail.com',
          to: email,                   // from req.body.to
          subject: assunto,         //from req.body.subject
          html: messagem             //from req.body.message
      };
     //delivery
     transporter.sendMail(mailOptions, function(error, info){
          if (error) {
              console.log(error);  
          } else {     
              console.log('Email sent: ' + info.response);  
          }   
     });
	

});

app.post('/login', function(request, response) {
	var username = request.body.email;
	var password = request.body.senha;
	//console.log(username, password);
	if (username && password) {
		pool.query('SELECT * FROM CONTAS WHERE username = $1 AND password = $2', [username, password], function(error, results, fields) {
			console.log(results);
			//console.log('Entrou aqui', results.length);
			if (results.rowCount > 0) {
				request.session.loggedin = true;
				request.session.username = username;

                console.log("Entrou aqui")
				response.redirect('/home');
			} else {
				response.send('Incorrect Username and/or Password!');
			}
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.get('/home', function(request, response) {
	response.sendFile(path.join(__dirname + '/home.html'));
});

app.get('/sair', function(request, response) {
	response.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(3000);