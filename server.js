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
const Excel = require('exceljs');


var app = express();

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

const PORT = process.env.PORT || 3000;

const { Pool } = require('pg');
const { Console } = require('console');

var obj = JSON.parse(fs.readFileSync('config.json', 'utf8'));

//console.log(obj); Testeeee

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

    sqlString = "SELECT * FROM CADASTRO_PROJETOS"


    pool.query(sqlString, function(error, results) {

        if (error) {
            console.log("Entrouuu", error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            //console.log(results.rows)
            //response.send(JSON.parse(JSON.stringify(results.rows)))
            //response.render(__dirname + '/pages/cadastro-projeto.html', { data: JSON.parse(JSON.stringify(results.rows)) });
            response.status(200).render(__dirname + '/pages/cadastro-projeto.html', { dados: JSON.stringify(results.rows) });

        }



    });


    //response.render(__dirname + '/pages/cadastro-projeto.html');

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

app.get('/buscarExcel', function(request, response) {


    console.log("Entrouuuu aquiiii");

    dataInicio = "'" + request.body['dataInicio'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";
    dataFim = "'" + request.body['dataFim'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";

    //const workbook = new Excel.Workbook();
    //const worksheet = workbook.addWorksheet("My Sheet");

    //worksheet.columns = [
    //    { header: 'Id', key: 'id', width: 10 },
    //   { header: 'Name', key: 'name', width: 32 },
    //    { header: 'D.O.B.', key: 'dob', width: 15, }
    //];

    //worksheet.addRow({ id: 1, name: 'John Doe', dob: new Date(1970, 1, 1) });
    //worksheet.addRow({ id: 2, name: 'Jane Doe', dob: new Date(1965, 1, 7) });

    // save under export.xlsx
    //workbook.xlsx.writeFile('export.xlsx');

    var workbook = new Excel.Workbook();

    workbook.creator = 'Me';
    workbook.lastModifiedBy = 'Her';
    workbook.created = new Date(1985, 8, 30);
    workbook.modified = new Date();
    workbook.lastPrinted = new Date(2016, 9, 27);
    workbook.properties.date1904 = true;

    workbook.views = [{
        x: 0,
        y: 0,
        width: 10000,
        height: 20000,
        firstSheet: 0,
        activeTab: 1,
        visibility: 'visible'
    }];
    var worksheet = workbook.addWorksheet('My Sheet');
    worksheet.columns = [
        { header: 'Id', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 32 },
        { header: 'D.O.B.', key: 'dob', width: 10, outlineLevel: 1, type: 'date', formulae: [new Date(2016, 0, 1)] }
    ];

    worksheet.addRow({ id: 1, name: 'John Doe', dob: new Date(1970, 1, 1) });
    worksheet.addRow({ id: 2, name: 'Jane Doe', dob: new Date(1965, 1, 7) });

    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader("Content-Disposition", "attachment; filename=" + "Report.xlsx");
    workbook.xlsx.write(response)
        .then(function(data) {
            response.end();
            console.log('File write done........');
        });

    //console.log(dataInicio, dataFim)

    // sqlString = "SELECT * FROM PROJETOS WHERE TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') > REPLACE(" + dataInicio + ", ' ', '') AND TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') <= REPLACE(" + dataFim + ", ' ', '')"
    //     //sqlString = "SELECT * FROM projetos"
    // pool.query(sqlString, function(error, results) {

    //     if (error) {
    //         console.log(error.stack)

    //         response.send(JSON.stringify(error.stack))
    //     } else {

    //         response.send(JSON.parse(JSON.stringify(results.rows)))

    //     }



    //});

    //console.log("Entrou aqui", sqlString)

});

app.post('/cadastro', function(request, response) {
    //console.log("Entrou aqqqqq", request.body.nome)

    var nome = request.body.nome;
    var status = request.body.status;
    var resumo = request.body.resumo;
    var texto = request.body.texto;

    var data = new Date();
    data_insert = date.format(data, 'YYYY-MM-DD HH:mm:ss');
    //console.log(request.body.uf);

    const text = "INSERT INTO CADASTRO_PROJETOS(titulo_do_projeto, resumo, texto_projeto, status) VALUES ($1, $2, $3, $4)";
    const valores = [nome, resumo, texto, status]

    //console.log(text, valores)
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

    //console.log("EEEEEEEE");
    //response.redirect('/cadastro');
    //response.sendFile(path.join(__dirname + '/pages/cadastro-projeto.html'));

});

app.get('/sair', function(request, response) {
    response.redirect('/login');
});

app.listen(PORT, () => {
    console.log("Executando o projeto", PORT);
});