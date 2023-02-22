const express = require("express");
const cors = require("cors");
const app = express();
const port = 3001;
const dotenv = require('dotenv/config.js');
const { Client } = require('pg');
const jwt = require('jsonwebtoken')
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
const USER_BD = process.env.USER_BD
const HOST = process.env.HOST
const DATABASE = process.env.DATABASE
const PASSWORD_BD = process.env.PASSWORD_BD
const PORT_CLIENT = process.env.PORT_CLIENT

const client = new Client({
  user: USER_BD,
  host: HOST,
  database: DATABASE,
  password: PASSWORD_BD,
  port: PORT_CLIENT,
})
client.connect()

app.use(cors());
const SECRET = process.env.SECRET
const verifyJWT = (req, res, next) => {
  const token = req.headers['x-access-token'];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).end();
    req.userId = decoded.userId;
    next();
  })
}

app.get('/client', verifyJWT, (req, res) => {
  res.status(200).send("Welcome 🙌 ");
})

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email, password)
  client.query(`select * from usuarios WHERE email = $1 AND password = $2`, [email, password])
    .then(results => {
      const resultado = results
      console.log("enviou resposta");
      if (resultado.rowCount === 1) {
        const nome = results.rows[0].name;
        const token = jwt.sign({ userId: 1, email: email }, SECRET, { expiresIn: '1h' })
        return res.json({ "message": "sucesso", auth: true, token, email, nome });
      } else {
        return res.json({ "error": "Credencias Inválidas" });
      }
    })
    .catch(e => console.log(" erro!!",))
});

app.post('/insertTable', (req, res) => {
  const email = req.body.email;
  const descricao = req.body.descricao;
  const valor = req.body.valor;
  const operacao = req.body.tipo;
  console.log(descricao, valor, operacao)
  if (valor.length > 0) {
    if (descricao.length > 0) {
      client.query('INSERT INTO entradaesaidas(email,tipo,valor,descricao) VALUES($1, $2, $3, $4)', [email, operacao, valor, descricao])
        .then(results => {
          const resultado = results;
          if (resultado.rowCount === 1) {
            return res.json({ "enviado": "sucesso" })
          } else {
            return res.json({ "error": "Nao cadastrado" })
          }
        })
    }
    else {
      return res.json({ "error": "VALOR OU DESCRIÇAO INVALIDOS" })

    }
  } else {
    return res.json({ "error": "VALOR OU DESCRIÇÂO INVALIDOS" })

  }
})

app.post('/cadastrarClient', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  const passwordConfirmacao = req.body.passwordConfirmacao;
  client.query(`select * from usuarios WHERE email = $1`, [email])
    .then(results => {
      const resultadoQuery = results
      if (resultadoQuery.rowCount === 1) {
        res.json({ "error": "E-mail já possui cadastro" })
      } else {
        if (password === passwordConfirmacao) {
          client.query(`INSERT INTO usuarios (email,password,name) VALUES ($1, $2, $3)`, [email, password, name])
            .then(results => {
              const resultado = results
              if (resultado.rowCount === 1) {
                return res.json({ "cadastrado": "Usuario cadastrado com sucesso" });
              } else {
                return res.json({ "error": "Erro ao cadastrar" });
              }
            })
        } else {
          return res.json({ "error": "Erro: Senhas Diferentes" });
        }
      }
    });
});

app.post('/buscarRegistros', (req, res) => {
  console.log('estou funcionando')
  const email = req.body.email;
  const entrada = 'entrada';
  const saida = 'saida';

  client.query('select * from entradaesaidas where email = $1', [email])
    .then(results => {
      const resultado = results
      return res.json({ "resultado": resultado });
    })

})

app.post('/buscarEntradas', (req, res) => {
  const email = req.body.email;
  const tipo = 'entrada'
  client.query('select * from entradaesaidas where email = $1 and tipo = $2', [email, tipo])
    .then(results => {
      const resultado = results;
      const list = resultado.rows;
      if(resultado.rowCount === 0){
         console.log(resultado.rowCount )
      return res.json({ 'nenhuma': '0' });
    }
      if (resultado) {
        var sum = 0;
        for (var i = 0; i < list.length; i++) {
          sum += Number(list[i].valor);
        }
        return res.json({ 'entradas': sum });
      }
    })
})

app.post('/buscarSaidas', (req, res) => {
  const email = req.body.email;
  const tipo = 'saida'
  client.query('select * from entradaesaidas where email = $1 and tipo = $2', [email, tipo])
    .then(results => {
      const resultado = results;
      const list = resultado.rows
      if(resultado.rowCount === 0){
        console.log(resultado.rowCount )
     return res.json({ 'nenhuma': '0' });
   }
      if (resultado) {
        var sum = 0;
        for (var i = 0; i < list.length; i++) {
          sum += Number(list[i].valor);
        }
        return res.json({ 'saidas': sum });
      }
    })
})


app.post('/deletAllTable', (req, res) => {
  const click = req.body.click;
  const email = req.body.email;
  if (click === 'clicou') {

    client.query('SELECT * FROM entradaesaidas where email = $1', [email])
      .then(results => {
        const resultado = results;
        console.log(resultado.rowCount, "select")
        if (resultado.rowCount === 0) {
          console.log('nada a ser limpor')
          return res.json({ 'error': "Nenhum registro encontrado :(" });
        } else {
          client.query('DELETE FROM entradaesaidas where email = $1', [email])
            .then(results => {
              const resultado = results;
              return res.json({ 'clear': "Registros apagados" });
            })
        }
      })
  }
})

app.post('/deletRowTable', (req, res) => {
  const rowTable = req.body.row;
  const email = req.body.email;
  client.query('SELECT * FROM entradaesaidas where email = $1', [email])
      .then(results => {
        const resultado = results;
        const descricao = resultado.rows[rowTable].descricao;
        const tipo = resultado.rows[rowTable].tipo;
        const valor = resultado.rows[rowTable].valor;
        if (resultado.rows) {
          client.query('DELETE FROM entradaesaidas where email = $1 and valor = $2 and tipo = $3  and descricao = $4', [email,valor,tipo,descricao])
            .then(results => {
              const resultado = results;
              console.log(resultado)
              return res.json({ 'clear': "Registros apagados" });
            })
        }
      })
})


app.listen(port, () => {
  console.log('Rodando na porta', port)
})

