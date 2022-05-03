require('dotenv').config()

var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
const { google } = require('googleapis');
//var smtpTransport = require('nodemailer-smtp-transport')
const date = require('date-and-time');
//var moment = require('moment');

var excel = require('node-excel-export');

const jwt = require('jsonwebtoken')

var app = express();

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

const PORT = process.env.PORT || 3000;

const { Pool } = require('pg');
const { Console } = require('console');

var obj = JSON.parse(fs.readFileSync('config.json', 'utf8'));

let refreshTokens = [];
let acessToken;

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
        segure: true,
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
    response.sendFile(path.join(__dirname + '/pages/index.html'));
});

app.get('/login', function(request, response) {
    response.sendFile(path.join(__dirname + '/pages/login.html'));
});

app.get('/projeto', function(request, response) {
    response.sendFile(path.join(__dirname + '/pages/index_projeto.html'));
});

app.post('/projeto', function(request, response) {

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

    pool.query(text, valores,
        (err, res) => {
            if (err) {
                console.log(err.stack)
            } else {
                response.json({ success: true });
            }

            pool.end();
        }
    );


});

app.get('/download', function(request, response) {
    response.download(__dirname + '/public/Template.doc');
});

app.get('/downloadInformacoes', function(request, response) {
    response.download(__dirname + '/public/BancaApres.pdf');
});

app.get('/downloadMaterial', function(request, response) {
    response.download(__dirname + '/public/arquivo1.pptx');
});

app.post('/email', function(request, response) {


    var email = request.body.email2;
    var assunto = request.body.assunto;
    var messagem = request.body.messagem;
    var a = request.body.a;
    var b = request.body.b;

    valores = a.split("+")

    soma = parseInt(valores[0]) + parseInt(valores[1])
    soma_recebida = parseInt(b)

    if (soma == soma_recebida) {
        if (email != undefined && assunto != undefined && messagem != undefined) {
            const mailOptions = {
                from: email,
                to: 'juliocartier@gmail.com, walterm@ufersa.edu.br',
                subject: assunto,
                text: messagem
            };

            transport.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            response.redirect('/#contato');
        } else {
            response.redirect('/#contato');
        }

    } else {
        response.redirect('/#contato');
    }

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

                    const user = { name: username }

                    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
                        //const accessToken = generateAcessToken(user)
                    acessToken = generateAcessToken(user)
                    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
                    refreshTokens.push(refreshToken)

                    console.log(accessToken)

                    request.session.loggedin = true;
                    request.session.username = username;

                    //console.log("Entrou aqui")
                    response.redirect('/home');

                } else {
                    response.redirect('/login');
                    response.end();
                    //	response.send('Incorrect Username and/or Password!');
                }

            }
        });
    } else {
        response.send('Please enter Username and Password!');
        response.end();
    }
});

app.get('/videos', function(request, response) {

    response.render(__dirname + '/pages/videos.html');
});

app.post('/videos', function(request, response) {

    sqlString = "SELECT * FROM CADASTRO_PROJETOS ORDER BY ID"

    pool.query(sqlString, function(error, results) {

        if (error) {
            console.log(error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            //console.log(results)
            response.send(JSON.parse(JSON.stringify(results.rows)))

        }



    });

});

app.get('/home', authenticateToken, function(request, response) {

    response.render(__dirname + '/pages/home.html');
});

app.get('/cadastro', authenticateToken, function(request, response) {

    sqlString = "SELECT * FROM CADASTRO_PROJETOS ORDER BY ID"


    pool.query(sqlString, function(error, results) {

        if (error) {
            //console.log("Entrouuu", error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            response.status(200).render(__dirname + '/pages/cadastro-projeto.html', { results: results });

        }



    });


});

app.put('/cadastro/:id', authenticateToken, function(request, response) {

    id = parseInt(request.body.id);

    //console.log("Entrouuuu 22", id);

    sqlString = "SELECT * FROM CADASTRO_PROJETOS WHERE ID = $1"


    pool.query(sqlString, [id], function(error, results) {

        if (error) {
            //console.log("Entrouuu", error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            response.json(JSON.parse(JSON.stringify(results.rows)));


        }



    });


});

app.delete('/cadastro/:id', authenticateToken, function(request, response) {

    id = parseInt(request.body.id);

    //console.log("Entrouuuuu", id)
    sqlString = "DELETE FROM CADASTRO_PROJETOS WHERE id = $1"


    pool.query(sqlString, [id], function(error, results) {

        if (error) {
            console.log("Entrouuu", error)

            response.send(JSON.stringify(error.stack))
        } else {

            response.json({ success: true });

        }



    });

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


});

app.post('/buscarExcel', function(request, response) {


    dataInicio = "'" + request.body['dataInicio'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";
    dataFim = "'" + request.body['dataFim'].split("/").reverse().join("-").replace(/\s+/g, '') + "'";

    let styles = {
        headerDark: {
            font: {
                color: {
                    rgb: 'FF000000'
                },
                sz: 12,
                bold: false,
                underline: false
            }
        }
    };

    let specification = {
        id: {
            displayName: 'Id',
            headerStyle: styles.headerDark,
            width: 120
        },
        data_cadastro: {
            displayName: 'Data de Cadastro',
            headerStyle: styles.headerDark,
            width: 220
        },
        nome: {
            displayName: 'Nome',
            headerStyle: styles.headerDark,
            width: 220
        },
        email: {
            displayName: 'E-mail',
            headerStyle: styles.headerDark,
            width: 220
        },
        uf: {
            displayName: 'UF',
            headerStyle: styles.headerDark,
            width: 220
        },
        cidade: {
            displayName: 'Cidade',
            headerStyle: styles.headerDark,
            width: 220
        },
        nomeescola: {
            displayName: 'Nome da Escola',
            headerStyle: styles.headerDark,
            width: 220
        },
        telefone: {
            displayName: 'Telefone',
            headerStyle: styles.headerDark,
            width: 220
        },
        indicacaoprofessor: {
            displayName: 'Indicação do Professor',
            headerStyle: styles.headerDark,
            width: 220
        },
        acoes: {
            displayName: 'Ações',
            headerStyle: styles.headerDark,
            width: 220
        }
    };



    sqlString = "SELECT * FROM PROJETOS WHERE TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') > REPLACE(" + dataInicio + ", ' ', '') AND TO_CHAR(DATA_CADASTRO, 'YYYY-MM-DD') <= REPLACE(" + dataFim + ", ' ', '')"

    pool.query(sqlString, function(error, results) {

        if (error) {
            console.log(error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            let dataset = []
            for (i = 0; i < results.rowCount; i++) {
                dataset.push({
                    id: results.rows[i].id,
                    data_cadastro: results.rows[i].data_cadastro,
                    nome: results.rows[i].nome,
                    email: results.rows[i].email,
                    uf: results.rows[i].uf,
                    cidade: results.rows[i].cidade,
                    nomeescola: results.rows[i].nomeescola,
                    telefone: results.rows[i].telefone,
                    indicacaoprofessor: results.rows[i].indicacaoprofessor,
                    acoes: results.rows[i].acoes
                })
            }

            console.log(dataset)


            let report = excel.buildExport(
                [{
                    name: 'Incrições', // <- Specify sheet name (optional)
                    specification: specification, // <- Report specification
                    data: dataset // <-- Report data
                        //data: results.rows
                }]
            );

            // convert excel file content to base64 and send to a client
            response.send({ content: report.toString('base64') });
            //response.send(JSON.parse(JSON.stringify(results.rows)))

        }

    });

});

app.post('/cadastro', authenticateToken, function(request, response) {
    //console.log("Entrou aqqqqq", request.body.nome)

    var id = request.body.id;
    var nome = request.body.nome;
    var resumo = request.body.resumo;

    var data = new Date();
    data_insert = date.format(data, 'YYYY-MM-DD HH:mm:ss');
    //console.log(request.body.uf);

    const text = "INSERT INTO CADASTRO_PROJETOS(titulo_do_projeto, resumo) VALUES ($1, $2)";
    const valores = [nome, resumo]

    const sqlStringUpdate = "UPDATE CADASTRO_PROJETOS SET titulo_do_projeto = $1, resumo = $2 WHERE id = $5";
    const valoresUpdate = [nome, resumo, id]

    if (!id) {
        pool.query(text, valores,
            (err, res) => {
                if (err) {
                    console.log(err.stack)
                } else {
                    //console.log("Valores Inseridos", res);
                    response.json({ success: true });
                }

                pool.end();
            }
        );
    } else {

        pool.query(sqlStringUpdate, valoresUpdate,
            (err, res) => {
                if (err) {
                    console.log(err.stack)
                } else {
                    //console.log("Valores Atualizados", res);
                    response.json({ success: true });
                }

                pool.end();
            }
        );

    }


});

app.get('/sair', function(request, response) {
    refreshTokens = []
    acessToken = ''
    response.redirect('/login');
});

app.get('/projetosEmAndamento', function(request, response) {

    sqlString = "SELECT * FROM CADASTRO_PROJETOS WHERE STATUS LIKE 'andamento' ORDER BY ID"

    pool.query(sqlString, function(error, results) {

        if (error) {
            console.log("Entrouuu", error.stack)

            response.send(JSON.stringify(error.stack))
        } else {

            //console.log(results);
            response.send(JSON.parse(JSON.stringify(results.rows)))

        }

    });

});

function generateAcessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20m' })
}

function authenticateToken(req, res, next) {

    const token = acessToken

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

app.listen(PORT, () => {
    console.log("Executando o projeto", PORT);
});