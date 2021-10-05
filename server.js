var http = require('http');
var fs = require('fs');
var path = require('path');
//var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
const { google } = require('googleapis');
var smtpTransport = require('nodemailer-smtp-transport')
const date = require('date-and-time');
var moment = require('moment');


var app = express();

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

const PORT = process.env.PORT || 3000;

const { Pool } = require('pg');
const { Console } = require('console');

var obj = JSON.parse(fs.readFileSync('config.json', 'utf8'));

//console.log(obj);

//Conexão com o banco de dados
const pool = new Pool({
    user: obj.banco.user,
    host: obj.banco.host,
    database: obj.banco.database,
    password: obj.banco.password,
    port: obj.banco.port,
})

const oAuth2Cliente = new google.auth.OAuth2(obj.authentic.CLIENT_ID, obj.authentic.CLIENT_SECRET, obj.authentic.REDIRECT_URI)
oAuth2Cliente.setCredentials({ refresh_token: obj.authentic.REFRESH_TOKEN })

const accessToken = oAuth2Cliente.getAccessToken();
const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: 'juliocartier@gmail.com',
        clientId: obj.authentic.CLIENT_ID,
        clientSecret: obj.authentic.CLIENT_SECRET,
        refreshToken: obj.authentic.REFRESH_TOKEN,
        accessToken: accessToken
    }
})

app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use(express.static("public"));

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/login', function(request, response) {
    response.sendFile(path.join(__dirname + '/pages/login.html'));
});

app.get('/projeto', function(request, response) {
    response.sendFile(path.join(__dirname + '/pages/index_projeto.html'));
});

app.post('/projeto', function(request, response) {
    //console.log("Entrou aqqqqq", request.body.nome)

    var nome = request.body.nome;
    var email = request.body.email;
    var uf = request.body.estado;
    var cidade = request.body.municipios;
    var nomeEscola = request.body.nomeEscola;
    var telefone = request.body.telefone;
    var indicacao = request.body.indicacao;
    var messagem = request.body.messagem;

    var data = new Date();
    data_insert = date.format(data, 'YYYY-MM-DD HH:mm:ss');
    //console.log(request.body.uf);

    const text = "INSERT INTO PROJETOS(nome, email, uf, cidade, nomeEscola, telefone, indicacaoProfessor, acoes, data_cadastro) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    const valores = [nome, email, uf, cidade, nomeEscola, telefone, indicacao, messagem, data_insert]

    console.log(text, valores)
    pool.query(text, valores,
        (err, res) => {
            if (err) {
                console.log(err.stack)
            } else {
                console.log("Valores Inseridos", res);
            }

            pool.end();
        }
    );
    response.sendFile(path.join(__dirname + '/pages/index_projeto.html'));

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
        from: email,
        to: 'juliocartier@gmail.com, walterm@ufersa.edu.br',
        subject: assunto,
        text: messagem
    };
    //delivery
    transport.sendMail(mailOptions, function(error, info) {
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
        pool.query('SELECT * FROM contas WHERE username = $1 AND password = $2', [username, password], function(error, results, fields) {
            //console.log(results.rows[0]['username']);

            if (error) {
                console.log("Entrouuu aquii", error.stack)
                response.end();
            } else {
                //console.log('Entrou aqui', results.rows[0]['username'], username);
                if (results.rows[0]['username'] == username && results.rows[0]['password'] == password) {
                    request.session.loggedin = true;
                    request.session.username = username;

                    console.log("Entrou aqui")
                    response.redirect('/home');
                    //response.render(__dirname + '/home.html');
                } else {
                    response.redirect('/login');
                    response.end();
                    //	response.send('Incorrect Username and/or Password!');
                }
                //response.redirect('/login');
                //response.end();
            }
        });
    } else {
        response.send('Please enter Username and Password!');
        response.end();
    }
});

app.get('/home', function(request, response) {

    response.render(__dirname + '/pages/home.html');
});

app.get('/cadastro', function(request, response) {

    response.render(__dirname + '/pages/cadastro-projeto.html');

});

app.post('/buscarDadosPorData', function(request, response) {

    dataInicio = "'" + request.body['dataInicio'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";
    dataFim = "'" + request.body['dataFim'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";

    data_cadastro = []
    nome = []
    email = []
    cidade = []
    nomeescola = []
    telefone = []
    indicacaoprofessor = []
    acoes = []

    //console.log(dataInicio, dataFim)

    sqlString = "SELECT * FROM PROJETOS WHERE TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') > REPLACE(" + dataInicio + ", ' ', '') AND TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') <= REPLACE(" + dataFim + ", ' ', '')"
        //sqlString = "SELECT * FROM projetos"
    pool.query(sqlString, function(error, results) {

        if (error) {
            console.log(error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            response.send(JSON.parse(JSON.stringify(results.rows)))

        }



    });

    //console.log("Entrou aqui", sqlString)

});

app.get('/sair', function(request, response) {
    response.redirect('/login');
});

app.listen(PORT, () => {
    console.log("Executando o projeto", PORT);
});