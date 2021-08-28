var http = require('http');
var fs = require('fs');
var path = require('path');
//var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
const {google} = require('googleapis');
var smtpTransport = require('nodemailer-smtp-transport')




var app = express();

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

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

const CLIENT_ID = '1005697518083-vd1kegae5gt71duvipp5sfjpm0uf0i0m.apps.googleusercontent.com'
const CLIENT_SECRET = 'YWV6isHBR_A4OE6RgGpar4Xr'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04acCyneBK9JdCgYIARAAGAQSNwF-L9IrSorznzbxc-E8L5wFHWdCqHCjKfGPWo79YSd3Fmp2ePFMk-x7CndOXS_J5BGvORIKuj8'

const oAuth2Cliente = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Cliente.setCredentials({ refresh_token: REFRESH_TOKEN })

const accessToken = oAuth2Cliente.getAccessToken();
const transport = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		type: 'OAuth2',
		user: 'juliocartier@gmail.com',
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET,
		refreshToken: REFRESH_TOKEN,
		accessToken: accessToken
	}
})


// async function sendMain(){

// 	try {

// 		const accessToken = await oAuth2Cliente.getAccessToken();
// 		const transport = nodemailer.createTransport({
// 			service: 'gmail',
// 			auth: {
// 				type: 'OAuth2',
// 				user: 'juliocartier@gmail.com',
// 				clientId: CLIENT_ID,
// 				clientSecret: CLIENT_SECRET,
// 				refreshToken: REFRESH_TOKEN,
// 				accessToken: accessToken
// 			}
// 		})

// 		const mailOptions = {
// 			from: 'juliocartier@gmail.com',
// 			to: 'juliocartier@gmail.com',
// 			subject: 'Sending Email using Node.js',
// 			text: 'That was easy!',
// 			html: '<h1>That was easy!</h1>'
// 		  }; 

// 		  const result = await transport.sendMail(mailOptions);
// 		  return result


// 	} catch (error){
// 		return error
// 	}
// }  


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

	const text= "INSERT INTO PROJETOS(nome, email, cidade, nomeEscola, telefone, indicacaoProfessor, acoes) VALUES ($1, $2, $3, $4, $5, $6, $7)";
	const valores = [nome, email, cidade, nomeEscola, telefone, indicacao, messagem]

		pool.query(text, valores,
  					(err, res) => {
    			console.log(err, res);
    		pool.end();
  			}
		);
	
	response.sendFile(path.join(__dirname + '/index_projeto.html'));
	

	/*var mailOptions = {
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
	  });*/

});

app.get('/download', function(request, response) {
	response.download(__dirname + '/public/Template.doc');
});


app.post('/email', function(request, response) {

	     var email = request.body.email2;
         var assunto = request.body.assunto; 
         var messagem = request.body.messagem;

		 console.log("Entrou aqui", email, assunto, messagem);

		 const mailOptions = {
			from: 'juliocartier@gmail.com',
			to: 'juliocartier@gmail.com',
			subject: assunto,
			text: messagem
			//html: '<h1>That was easy!</h1>'
		  }; 
     	//delivery
		 transport.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);  
			} else {     
				console.log('Email sent: ' + info.response);  
			}   
		});
	
		response.redirect('/#contato');

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

                //console.log("Entrou aqui")
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
	pool.query('SELECT * FROM PROJETOS', function(error, results) {
		
		
		//console.log(results.rows[0].nome);

		//response.sendFile(path.join(__dirname + '/home.html'));

		//response.status(200).json(results.rows)
		//response.render('home');
		//request.status(200).send(results.rows.nome);
		//console.log('Entrou aqui', results.length);

		//response.sendFile(path.join(__dirname + '/home.html'));

		//response.render(path.join(__dirname, '/pages', 'home.html'));
		response.render(__dirname + '/home.html', {results: results});
		//res.render(path.join(__dirname, '/public', 'homepage.html'));
	});

	//response.sendFile(path.join(__dirname + '/home.html'));
	

	//return request.status(200).send(response.rows);

});

app.get('/sair', function(request, response) {
	response.redirect('/');
});

app.listen(3000);