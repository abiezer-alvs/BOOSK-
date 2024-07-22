const express = require('express');
const mysql = require('mysql');
const formidable = require('formidable');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer')
const bcrypt = require("bcrypt");
const saltRounds = 10;
var session = require('express-session');
const { latLng } = require('@google/maps/lib/internal/convert');
const app = express();
const upload = multer({ dest: 'public/imagens/' });
const cookieParser = require('cookie-parser');

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.urlencoded({ extended: true }))
app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(cookieParser());

var con = mysql.createConnection({
    host: "127.0.0.1", 
    user: "user_mysql01",
    password: "aajwG827Y8DW",
    database: "db_mysql01",
    port: 3306
});

app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: false,
    saveUninitialized: true
}));

con.connect(function (err) {
    if (err) throw err;
    console.log("Conectado com sucesso");
});

app.use((req, res, next) => {
    id = req.session.userId;
    var sql = "SELECT * FROM tb_usuario where id_usuario = ?";
    con.query(sql, id, function (err, result) {
        const dadosUsuario = result;
        res.locals.dadosUsuario = dadosUsuario;
        next();
    });

});
app.use((req, res, next) => {
    var sql = "SELECT * FROM tb_categoria";
    con.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        const dadosCat = result;
        res.locals.dadosCat = dadosCat;
        next();
    });
});
app.use((req, res, next) => {
    id1 = req.session.estId;
    var sql1 = "SELECT * FROM tb_estabelecimento where id_estabelecimento = ?";
    con.query(sql1, id1, function (err, result) {
        const dadosEstabelecimento = result;
        res.locals.dadosEstabelecimento = dadosEstabelecimento;
        next();
    });
});

app.get('/', function (req, res) {
    res.render('home.ejs');
});

app.post('/cadastroUsuario', function (req, res) {
    const nome = req.body['nome'];
    const email = req.body['email'];
    const senha = req.body['senha'];
    const estado = req.body['estado'];
    const cidade = req.body['cidade'];

    var sql1 = "SELECT COUNT(*) AS count FROM tb_usuario WHERE email = ?";
    con.query(sql1, [email], function (err, result) {
        if (err) throw err;

        if (result[0].count > 0) {
            res.render('cadastroUsuario', { mensagem: "E-mail jÃ¡ cadastrado!" })
        } else {
            bcrypt.hash(senha, saltRounds, function (err, hash) {
                if (err) throw err;

                var sql = "INSERT INTO tb_usuario (nm_usuario, email, senha, estado, cidade) VALUES (?, ?, ?, ?, ?)";
                con.query(sql, [nome, email, hash, estado, cidade], function (err, result) {
                    if (err) throw err;

                    console.log("UsuÃ¡rio cadastrado com sucesso.");
                    res.redirect('/usuario01/loginUsuario');
                });
            });
        }
    });
});

app.get('/cadastroUsuario', function (req, res) {
    res.render('cadastroUsuario.ejs', { mensagem: null });
});

app.post('/loginUsuario', function (req, res) {
    var senha = req.body['senha'];
    var email = req.body['email']
    var sql = "SELECT * FROM tb_usuario where email = ?";
    con.query(sql, [email], function (err, result) {
        if (err) throw err;
        if (result.length) {
            bcrypt.compare(senha, result[0]['senha'], function (err, resultado) {
                if (err) throw err;
                if (resultado) {
                    req.session.logado = true;
                    req.session.username = result[0]['nm_usuario'];
                    req.session.userId = result[0]['id_usuario'];
                    req.session.tipo = 'usuario';
                    res.redirect('/usuario01/estabelecimentos');
                }
                else { res.render('loginUsuario.ejs', { mensagem: "Senha invÃ¡lida" }) }
            });
        }
        else { res.render('loginUsuario.ejs', { mensagem: "E-mail nÃ£o encontrado" }) }
    });
});
app.get('/loginUsuario', function (req, res) {
    res.render('loginUsuario.ejs', { mensagem: null });
});

app.post('/cadastroEstabelecimento', function (req, res) {
    const nome = req.body['nome'];
    const cnpj = req.body['cnpj'];
    const senha = req.body['senha'];
    const local = req.body['local'];
    const estado = req.body['estado'];
    const cidade = req.body['cidade'];

    var sql1 = "SELECT COUNT(*) AS count FROM tb_estabelecimento WHERE CNPJ = ?";
    con.query(sql1, [cnpj], function (err, result) {
        if (err) throw err;

        if (result[0].count > 0) {
            res.render('cadastroEstabelecimento', { mensagem: "CNPJ jÃ¡ cadastrado!" });
        } else {
            bcrypt.hash(senha, saltRounds, function (err, hash) {
                if (err) throw err;

                var sql = "INSERT INTO tb_estabelecimento (nm_estabelecimento, CNPJ, senha, local, estado, cidade) VALUES (?, ?, ?, ?, ?, ?)";
                con.query(sql, [nome, cnpj, hash, local, estado, cidade], function (err, result) {
                    if (err) throw err;

                    console.log("Estabelecimento cadastrado com sucesso.");
                    res.redirect('/usuario01/loginEstabelecimento');
                });
            });
        }
    });
});

app.get('/cadastroEstabelecimento', function (req, res) {
    res.render('cadastroEstabelecimento.ejs', { mensagem: null });
});

app.post('/loginEstabelecimento', function (req, res) {
    var senha = req.body['senha'];
    var cnpj = req.body['cnpj']
    var sql = "SELECT * FROM tb_estabelecimento where cnpj = ?";
    con.query(sql, [cnpj], function (err, result) {
        if (err) throw err;
        if (result.length) {
            bcrypt.compare(senha, result[0]['senha'], function (err, resultado) {
                if (err) throw err;
                if (resultado) {
                    req.session.logado = true;
                    req.session.nmEst = result[0]['nm_estabelecimento'];
                    req.session.estId = result[0]['id_estabelecimento'];
                    req.session.tipo = 'estabelecimento';
                    res.redirect('/usuario01/cadastroProduto');
                }
                else { res.render('loginEstabelecimento', { mensagem: "Senha invÃ¡lida" }) }
            });
        }
        else { res.render('loginEstabelecimento.ejs', { mensagem: "CNPJ nÃ£o encontrado" }) }
    });
});
app.get('/loginEstabelecimento', function (req, res) {
    res.render('loginEstabelecimento.ejs', { mensagem: null });
});

app.post('/cadastroProduto', upload.single('imagem'), (req, res) => {
    if (req.session.logado) {
        var descricao = req.body.descricao;
        var categoria = req.body.categoria;
        var preco = req.body.preco.replace(',', '.');
        var imagem = req.file;
        var estId = req.session.estId;

        var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        var nomeimg = hash + '.' + imagem.mimetype.split('/')[1];
        var newpath = path.join(__dirname, 'public/imagens/', nomeimg);

        fs.rename(imagem.path, newpath, function (err) {
            if (err) throw err;
        });

        var sql = "INSERT INTO produto_estabelecimento (id_estabelecimento, img_produto,categoria, descricao, preco) VALUES ?";
        var values = [[estId, nomeimg, categoria, descricao, preco]];
        con.query(sql, [values], function (err, result) {
            if (err) throw err;
            console.log("Produto cadastrado!!!");
        });
        res.redirect('/usuario01/produtoEstabelecimento');
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});
app.get('/cadastroProduto', function (req, res) {
    if (req.session.logado) {
        var sql = "SELECT * FROM tb_categoria"
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (req.session.logado) {
                res.render('cadastroProduto.ejs', { dadosProduto: result })
            }
            else {
                res.redirect('/usuario01/loginUsuario');
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }


});

app.get('/produtoEstabelecimento', function (req, res) {
    if (req.session.logado) {
        var estId = req.session.estId;
        var nm_estabelecimento = req.session.nmEst;
        var sql = "SELECT *, FORMAT(preco, 2, 'pt_BR') AS preco, FORMAT(preco_oferta, 2, 'pt_BR') AS preco_oferta, DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada FROM produto_estabelecimento where id_estabelecimento = ?"
        con.query(sql, estId, function (err, result, fields) {
            if (err) throw err;
            if (req.session.logado) {
                res.render('produtoEstabelecimento.ejs', { dadosProduto: result, nm_estabelecimento })
            }
            else {
                res.redirect('/usuario01/loginUsuario');
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.get('/estabelecimentos', function (req, res) {
    if (req.session.logado) {
        res.render('estabelecimentos.ejs', { apiKey: 'AIzaSyB-Df1IHjzcouQxfqwdHlvUnQivLLNQORY' });
    }
    else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/produtos', function (req, res) {
    if (req.session.logado) {
        var sql = "SELECT * FROM tb_estabelecimento"
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (req.session.logado) {
                res.render('produtos.ejs', { dadosEst: result })
            }
            else {
                res.redirect('/usuario01/loginUsuario');
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.post('/editaUsuario', upload.single('imagem'), function (req, res) {
    if (req.session.logado) {
        var id = req.session.userId;
        var nome = req.body.nome;
        var imagem = req.file;

        const hashImagem = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const nomeimg = hashImagem + '.' + imagem.mimetype.split('/')[1];
        const newpath = path.join(__dirname, 'public', 'imagens', nomeimg);

        var consultaNomeImagemAntiga = "SELECT img_perfil FROM tb_usuario WHERE id_usuario = ?";
        con.query(consultaNomeImagemAntiga, [id], function (err, rows) {
            if (err) {
                console.error(err);
                return res.status(500).send("Internal Server Error");
            }

            if (rows.length > 0) {
                var nomeImagemAntiga = rows[0].img_perfil;

                var updateDados = "UPDATE tb_usuario SET nm_usuario = ?, img_perfil = ? WHERE id_usuario = ?";
                con.query(updateDados, [nome, nomeimg, id], function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Internal Server Error");
                    }

                    fs.rename(imagem.path, newpath, (err) => {
                        if (err) {
                            console.error('Error moving file:', err);
                            return res.status(500).send("Internal Server Error");
                        }

                        if (nomeImagemAntiga) {
                            const imgAntiga = path.join(__dirname, 'public', 'imagens', nomeImagemAntiga);

    				if (fs.existsSync(imgAntiga)) {
        				fs.unlink(imgAntiga, (err) => {
            					if (err) {
               					 console.error('Error deleting old file:', err);
            					}
        				});
    				}
                        }

                        res.redirect('/usuario01/estabelecimentos');
                    });
                });
            } else {
                console.error("Não foi possível encontrar a imagem antiga.");
                return res.status(500).send("Internal Server Error");
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});
app.get('/editaUsuario', function (req, res) {
    if (req.session.logado) {
        var id = req.session.userId;
        var sql = "SELECT * FROM tb_usuario where id_usuario = ?"

        con.query(sql, id, function (err, result, fields) {
            if (err) throw err;
            res.render('editaUsuario.ejs', { dadosUsuario: result });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.post('/editaEstabelecimento', upload.single('imagem'), function (req, res) {
    if (req.session.logado) {
        var id = req.session.estId;
        var nome = req.body.nome;
        var endereco = req.body.endereco;
        var imagem = req.file;

        const hashImagem = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const nomeimg = hashImagem + '.' + imagem.mimetype.split('/')[1];
        const newpath = path.join(__dirname, 'public', 'imagens', nomeimg);

        var consultaNomeImagemAntiga = "SELECT img_perfil FROM tb_estabelecimento WHERE id_estabelecimento = ?";
        con.query(consultaNomeImagemAntiga, [id], function (err, rows) {
            if (err) {
                console.error(err);
                return res.status(500).send("Internal Server Error");
            }

            if (rows.length > 0) {
                var nomeImagemAntiga = rows[0].img_perfil;

         
                var updateDados = "UPDATE tb_estabelecimento SET nm_estabelecimento = ?, local = ?, img_perfil = ? WHERE id_estabelecimento = ?";
                con.query(updateDados, [nome, endereco, nomeimg, id], function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Internal Server Error");
                    }

              
                    fs.rename(imagem.path, newpath, (err) => {
                        if (err) {
                            console.error('Error moving file:', err);
                            return res.status(500).send("Internal Server Error");
                        }

                        
                        if (nomeImagemAntiga) {
                            const imgAntiga = path.join(__dirname, 'public', 'imagens', nomeImagemAntiga);

       				if (fs.existsSync(imgAntiga)) {
        				fs.unlink(imgAntiga, (err) => {
            					if (err) {
                				console.error('Error deleting old file:', err);
            				}
        			});
    			}
                     }

                        res.redirect('/usuario01/cadastroProduto');
                    });
                });
            } else {
                console.error("Não foi possível encontrar a imagem antiga.");
                return res.status(500).send("Internal Server Error");
            }
        });
    } else {
        res.redirect('/usuario01/loginEstabelecimento');
    }
});
app.get('/editaEstabelecimento', function (req, res) {
    if (req.session.logado) {
        var id = req.session.estId;
        var sql = "SELECT * FROM tb_estabelecimento where id_estabelecimento = ?"

        con.query(sql, id, function (err, result, fields) {
            if (err) throw err;
            res.render('editaEstabelecimento.ejs', { dadosEstabelecimento: result });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.post('/editaProduto/:id_produto', upload.single('imagem'), function (req, res) {
    if (req.session.logado) {
        var id = req.params.id_produto;
        var tipoUsuario = req.session.tipo;

        var descricao = req.body.descricao;
        var preco = req.body.preco.replace(',', '.');
        var endereco, categoria;
        var imagem = req.file;

        const hashImagem = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const nomeimg = hashImagem + '.' + imagem.mimetype.split('/')[1];
        const newpath = path.join(__dirname, 'public/imagens/', nomeimg);

        var updateDados;
        if (tipoUsuario === 'estabelecimento') {
            categoria = req.body.categoria;
            updateDados = "UPDATE produto_estabelecimento SET categoria = ?, descricao = ?, preco = ?, img_produto = ? WHERE id_produto = ?";
        } else {
            endereco = req.body.endereco;
            updateDados = "UPDATE produto_usuario SET local = ?, descricao = ?, preco = ?, img_produto = ? WHERE id_produto = ?";
        }

        var consultaNomeImagemAntiga;
        if (tipoUsuario === 'estabelecimento') {
            consultaNomeImagemAntiga = "SELECT img_produto FROM produto_estabelecimento WHERE id_produto = ?";
        } else {
            consultaNomeImagemAntiga = "SELECT img_produto FROM produto_usuario WHERE id_produto = ?";
        }

        con.query(consultaNomeImagemAntiga, [id], function (err, rows) {
            if (err) {
                console.error(err);
                return res.status(500).send("Internal Server Error");
            }

            if (rows.length > 0) {
                var nomeImagemAntiga = rows[0].img_produto;

                con.query(updateDados, [categoria || endereco, descricao, preco, nomeimg, id], function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Internal Server Error");
                    }

                    fs.rename(imagem.path, newpath, (err) => {
                        if (err) {
                            console.error('Error moving file:', err);
                            return res.status(500).send("Internal Server Error");
                        }

                        if (nomeImagemAntiga) {
                            const imgAntiga = path.join(__dirname, 'public/imagens/', nomeImagemAntiga);

                            if (fs.existsSync(imgAntiga)) {
                                fs.unlink(imgAntiga, (err) => {
                                    if (err) {
                                        console.error('Error deleting old file:', err);
                                    }
                                });
                            }
                        }

                        if (tipoUsuario === 'estabelecimento') {
                            res.redirect('/usuario01/produtos');
                        } else {
                            res.redirect('/usuario01/forum');
                        }
                    });
                });
            } else {
                console.error("Não foi possível encontrar a imagem antiga.");
                return res.status(500).send("Internal Server Error");
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});
app.get('/editaProduto/:id_produto', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id_produto;

        if (req.session.tipo === 'estabelecimento') {
            var sql = "SELECT *, FORMAT(preco, 2, 'pt_BR') AS preco FROM produto_estabelecimento where id_produto = ?"

            con.query(sql, id, function (err, result, fields) {
                if (err) throw err;
                res.render('editaProduto.ejs', { dadosProduto: result, dadosCat: res.locals.dadosCat });
            });
        } else {
            var sql = "SELECT *, FORMAT(preco, 2, 'pt_BR') AS preco FROM produto_usuario where id_produto = ?"

            con.query(sql, id, function (err, result, fields) {
                if (err) throw err;
                res.render('editaProduto.ejs', { dadosProduto: result });
            });
        }
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.get('/excluirProduto/:id', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id;
        if (req.session.tipo === 'estabelecimento') {
            var consultaImagem = "SELECT img_produto FROM produto_estabelecimento WHERE id_produto = ?";
            con.query(consultaImagem, id, function (err, result) {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Internal Server Error");
                }

                if (result.length > 0) {
                    var nomeImagem = result[0].img_produto;

                    if (nomeImagem) {
                        const imgPath = path.join(__dirname, 'public', 'imagens', nomeImagem);
                        if (fs.existsSync(imgPath)) {
                            fs.unlink(imgPath, (err) => {
                                if (err) {
                                    console.error('Error deleting image:', err);
                                }
                            });
                        }
                    }

                    var sql = "DELETE FROM salvos WHERE id_produto = ?";
                    con.query(sql, id, function (err, result) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Internal Server Error");
                        }

                        console.log("Registros em 'salvos' apagados: " + result.affectedRows);
                        var sql1 = "DELETE FROM produto_estabelecimento WHERE id_produto = ?";
                        con.query(sql1, id, function (err, result1) {
                            if (err) {
                                console.error(err);
                                return res.status(500).send("Internal Server Error");
                            }

                            console.log("Registros em 'produto_estabelecimento' apagados: " + result1.affectedRows);
                            res.redirect('back');
                        });
                    });
                } else {
                    console.error("Não foi possível encontrar a imagem do produto.");
                    return res.status(500).send("Internal Server Error");
                }
            });
        } else {
            var consultaImagem = "SELECT img_produto FROM produto_usuario WHERE id_produto = ?";
            con.query(consultaImagem, id, function (err, result) {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Internal Server Error");
                }

                if (result.length > 0) {
                    var nomeImagem = result[0].img_produto;

                    if (nomeImagem) {
                        const imgPath = path.join(__dirname, 'public', 'imagens', nomeImagem);
                        if (fs.existsSync(imgPath)) {
                            fs.unlink(imgPath, (err) => {
                                if (err) {
                                    console.error('Error deleting image:', err);
                                }
                            });
                        }
                    }

                    var sql = "DELETE FROM produto_usuario WHERE id_produto = ?";
                    con.query(sql, id, function (err, result) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Internal Server Error");
                        }

                        console.log("Registros em 'produto_usuario' apagados: " + result.affectedRows);
                        res.redirect('back');
                    });
                } else {
                    console.error("Não foi possível encontrar a imagem do produto.");
                    return res.status(500).send("Internal Server Error");
                }
            });
        }
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

let palavraChaveGlobal = '';
app.post('/pesquisar', async (req, res) => {
    if (req.session.logado) {
        palavraChaveGlobal = req.body.palavraChave;

        try {
            const result = await new Promise((resolve, reject) => {
                con.query("SELECT pe.*, FORMAT(pe.preco, 2, 'pt_BR') AS preco, FORMAT(pe.preco_oferta, 2, 'pt_BR') AS preco_oferta,  DATE_FORMAT(pe.data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada, te.id_estabelecimento, te.nm_estabelecimento FROM produto_estabelecimento pe JOIN tb_estabelecimento te ON pe.id_estabelecimento = te.id_estabelecimento WHERE pe.descricao LIKE ?", [`%${palavraChaveGlobal}%`], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });

            res.render('produtosPesquisa.ejs', { dadosProduto: result, palavraChaveGlobal: palavraChaveGlobal, req });

        } catch (err) {
            console.error(err);
        }
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});
app.get('/mostraProduto/:id', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id;
        var sql = "SELECT *,FORMAT(preco, 2, 'pt_BR') AS preco, FORMAT(preco_oferta, 2, 'pt_BR') AS preco_oferta,  DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada FROM produto_estabelecimento WHERE id_estabelecimento = ?";
        con.query(sql, id, function (err, result, fields) {
            var sql1 = "SELECT nm_estabelecimento FROM tb_estabelecimento where id_estabelecimento= ?"

            con.query(sql1, id, function (err, result1, fields) {
                var nomeEstabelecimento = result1[0].nm_estabelecimento;
                if (err) throw err;
                if (req.session.logado) {
                    res.render('perfilEstabelecimento.ejs', { dadosProdutos: result, idEstabelecimento: id, nomeEstabelecimento, req })
                }
                else {
                    res.redirect('/usuario01/loginUsuario');
                }
            });

        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.post('/filtraCategoria', function (req, res) {
    if (req.session.logado) {
        var categoria = req.body.categoria; 
        var idEstabelecimento = req.body.idEstabelecimento;

        var sql = "SELECT *, FORMAT(preco, 2, 'pt_BR') AS preco, FORMAT(preco_oferta, 2, 'pt_BR') AS preco_oferta, DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada FROM produto_estabelecimento WHERE id_estabelecimento = ? AND categoria = ?";
        con.query(sql, [idEstabelecimento, categoria], function (err, result, fields) {
            var sql1 = "SELECT nm_estabelecimento FROM tb_estabelecimento where id_estabelecimento= ?"

            con.query(sql1, idEstabelecimento, function (err, result1, fields) {
                var nomeEstabelecimento = result1[0].nm_estabelecimento;
                if (err) throw err;
                if (req.session.logado) {
                    res.render('perfilEstabelecimento.ejs', { dadosProdutos: result, idEstabelecimento, nomeEstabelecimento, req })
                }
                else {
                    res.redirect('/usuario01/loginUsuario');
                }
            });
            
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});


app.post('/filtraCidade', (req, res) => {
    if (req.session.logado) {
        if (req.body.cidade) {
            const cidade = req.body.cidade;

            const sql = `
                SELECT pe.*, 
                       FORMAT(pe.preco, 2, 'pt_BR') AS preco,
                       FORMAT(pe.preco_oferta, 2, 'pt_BR') AS preco_oferta, 
                       DATE_FORMAT(pe.data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
                       te.id_estabelecimento,
                       te.nm_estabelecimento
                FROM produto_estabelecimento pe
                JOIN tb_estabelecimento te ON pe.id_estabelecimento = te.id_estabelecimento
                WHERE pe.descricao LIKE ? 
                AND te.cidade = ?`;

            let params = [`%${palavraChaveGlobal}%`, cidade];

            con.query(sql, params, function (err, result) {
                if (err) throw err;
                res.render('produtosPesquisa.ejs', { dadosProduto: result, palavraChaveGlobal, req, cidade });
            });
        } else if (req.body.cidadeEst) {
            const cidade = req.body.cidadeEst;

            const sql = `
                SELECT * 
                FROM tb_estabelecimento
                WHERE 
                id_estabelecimento IN (
                    SELECT id_estabelecimento
                    FROM tb_estabelecimento
                    WHERE cidade LIKE ?
                )`;

            let params = [`%${cidade}%`];

            con.query(sql, params, function (err, result) {
                if (err) throw err;
                res.render('produtos.ejs', { dadosEst: result, req, cidade: cidade });
            });
        } else if (req.body.cidadeForum) {
            const cidade = req.body.cidadeForum;

            const sql = `
            SELECT 
                A.id_produto,
                FORMAT(preco, 2, 'pt_BR') AS preco,
                A.img_produto,
                A.local,
                DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
                A.descricao AS produto_descricao,
                B.nm_usuario AS nm_usuario,
                B.img_perfil AS img_perfil,
                B.id_usuario AS id_usuario
            FROM produto_usuario A
            INNER JOIN tb_usuario B 
            ON A.id_usuario = B.id_usuario
            WHERE B.cidade LIKE ?
            `;

            let params = [`%${cidade}%`];

            con.query(sql, params, function (err, result) {
                if (err) throw err;
                res.render('forum.ejs', { dadosProduto: result, req, cidade: cidade  });
            });
        } else if (req.body.cidadeOferta) {
            const cidade = req.body.cidadeOferta;

            const sql = `
            SELECT 
                A.*,FORMAT(preco, 2, 'pt_BR') AS preco,
                FORMAT(preco_oferta, 2, 'pt_BR') AS preco_oferta,
                B.nm_estabelecimento,
                DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
                DATE_FORMAT(data_oferta, '%Y-%m-%dT%H:%i:%s') AS data_oferta
            FROM produto_estabelecimento A
            INNER JOIN tb_estabelecimento B 
            ON A.id_estabelecimento = B.id_estabelecimento
            WHERE A.preco_oferta IS NOT NULL 
                AND A.preco_oferta <> ''
                AND B.cidade LIKE ?
            `;

            let params = [`%${cidade}%`];

            con.query(sql, params, function (err, result) {
                if (err) throw err;
                res.render('oferta.ejs', { dadosOferta: result, req, cidade: cidade  });
            });
        } else if (req.body.cidadeSalvo) {
            const cidade = req.body.cidadeSalvo;

            const sql = `
                SELECT A.*, 
                    FORMAT(A.preco, 2, 'pt_BR') AS preco,
                    FORMAT(A.preco_oferta, 2, 'pt_BR') AS preco_oferta,
                    D.id_estabelecimento,
                    D.nm_estabelecimento
                FROM produto_estabelecimento A
                INNER JOIN salvos B ON A.id_produto = B.id_produto
                INNER JOIN tb_usuario C ON B.id_usuario = C.id_usuario
                INNER JOIN tb_estabelecimento D ON A.id_estabelecimento = D.id_estabelecimento
                WHERE D.cidade LIKE ?;
            `;

            let params = [`%${cidade}%`];
            con.query(sql, params, function (err, result) {
                if (err) throw err;
                res.render('salvos.ejs', { produtosSalvos: result, req, cidade, erroSalvamento: null });
            });
        }
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.post('/addOferta/:id_produto', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id_produto;;
        var oferta = req.body.oferta.replace(',', '.');;
        var dataAlvo = req.body.dataAlvo;

        var updateDados = "UPDATE produto_estabelecimento SET preco_oferta = ?, data_oferta = ? WHERE id_produto = ?";
        con.query(updateDados, [oferta, dataAlvo, id], function (err, result) {
            if (err) {
                console.log(err);
                return res.status(500).send("Internal Server Error");
            }

        });
        res.redirect('/usuario01/oferta');
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});
app.get('/addOferta/:id_produto', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id_produto;
        var sql = "SELECT *, FORMAT(preco, 2, 'pt_BR') AS preco FROM produto_estabelecimento where id_produto = ?"

        con.query(sql, id, function (err, result, fields) {
            if (err) throw err;
            res.render('addOferta.ejs', { dadosProduto: result });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }

});

app.get('/oferta', function (req, res) {
    if (req.session.logado) {
        const sql = `
            SELECT A.*, 
                   FORMAT(A.preco, 2, 'pt_BR') AS preco,
                   FORMAT(A.preco_oferta, 2, 'pt_BR') AS preco_oferta,
                   B.nm_estabelecimento,
                   DATE_FORMAT(A.data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
                   DATE_FORMAT(A.data_oferta, '%Y-%m-%dT%H:%i:%s') AS data_oferta
            FROM produto_estabelecimento A
            INNER JOIN tb_estabelecimento B ON A.id_estabelecimento = B.id_estabelecimento
            WHERE A.preco_oferta IS NOT NULL AND A.preco_oferta <> '';
        `;

        con.query(sql, function (err, result, fields) {
            if (err) throw err;

            res.render('oferta.ejs', { dadosOferta: result, req });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/forum', function (req, res) {
    if (req.session.logado) {
        const sql = `
        SELECT 
            A.id_produto,
            FORMAT(preco, 2, 'pt_BR') AS preco,
            A.img_produto,
            A.local,
            DATE_FORMAT(data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
            A.descricao AS produto_descricao,
            B.nm_usuario AS nm_usuario,
            B.img_perfil AS img_perfil,
            B.id_usuario AS id_usuario
        FROM produto_usuario A
        INNER JOIN tb_usuario B ON A.id_usuario = B.id_usuario
        `;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            res.render('forum.ejs', { dadosProduto: result, req });
        });
    }
    else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.post('/cadastroProdUsuario', upload.single('imagem'), (req, res) => {
    if (req.session.logado) {
        var { descricao, endereco } = req.body;
        var preco = req.body.preco.replace(',', '.');
        var imagem = req.file;
        var userId = req.session.userId;

        var hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        var nomeimg = hash + '.' + imagem.mimetype.split('/')[1];
        var newpath = path.join(__dirname, 'public/imagens/', nomeimg);

        fs.rename(imagem.path, newpath, function (err) {
            if (err) throw err;
        });

        var sql = "INSERT INTO produto_usuario (id_usuario, img_produto, descricao, preco, local) VALUES ?";
        var values = [[userId, nomeimg, descricao, preco, endereco]];
        con.query(sql, [values], function (err, result) {
            if (err) throw err;
            console.log("Produto cadastrado!!!");
        });
        res.redirect('/usuario01/forum');
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});
app.get('/cadastroProdUsuario', function (req, res) {
    if (req.session.logado) {
        res.render('cadastroProdUsuario.ejs')
    }
    else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/salvar/:id', function (req, res) {
    if (req.session.logado) {
        var idProduto = req.params.id;
        var idUsuario = req.session.userId;

        var sql1 = "SELECT * FROM salvos WHERE id_produto = ? AND id_usuario = ?";
        con.query(sql1, [idProduto, idUsuario], function (err, result) {
            if (err) {
                console.error(err);
                res.redirect('/usuario01/salvos');
            } else if (result.length > 0) {
                res.render('salvos.ejs', { erroSalvamento: 'Este produto jÃ¡ foi salvo por vocÃª. NÃ£o Ã© possÃ­vel salvar novamente.', produtosSalvos: [] });
            } else {
                var sql = "INSERT INTO salvos (id_produto, id_usuario) VALUES (?, ?)";
                con.query(sql, [idProduto, idUsuario], function (err, insertResult) {
                    if (err) {
                        console.error(err);
                        res.redirect('/usuario01/salvos');
                    } else {
                        res.redirect('/usuario01/salvos');
                    }
                });
            }
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/cancelaSalvar/:id', function (req, res) {
    if (req.session.logado) {
        var id = req.params.id;
        var sql1 = "DELETE FROM salvos WHERE id_produto = ?";
        con.query(sql1, id, function (err, result1) {
            if (err) throw err;
            console.log("Registros em 'salvos' apagados: " + result1.affectedRows);

            res.redirect('/usuario01/salvos');
        });

    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/salvos', function (req, res) {
    if (req.session.logado) {
        const idUsuario = req.session.userId;

        const sql = `
            SELECT A.*, 
                   FORMAT(A.preco, 2, 'pt_BR') AS preco,
                   FORMAT(A.preco_oferta, 2, 'pt_BR') AS preco_oferta,
                   E.nm_estabelecimento
            FROM produto_estabelecimento A 
            INNER JOIN salvos B ON A.id_produto = B.id_produto
            INNER JOIN tb_estabelecimento E ON A.id_estabelecimento = E.id_estabelecimento
            WHERE B.id_usuario = ?
        `;
        con.query(sql, [idUsuario], (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Erro ao recuperar produtos salvos.');
                return;
            }

            res.render('salvos.ejs', { produtosSalvos: result, erroSalvamento: null });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/removeOferta/:id_produto', function (req, res) {
    if (req.session.logado) {
        const idProduto = req.params.id_produto;
        
        const sql = 'UPDATE produto_estabelecimento SET preco_oferta = NULL, data_oferta = NULL WHERE id_produto = ?';
        con.query(sql, [idProduto], function (err, updateResult) {
            if (err) {
                console.error(err);
                res.status(500).send('Erro ao remover a oferta.');
                return;
            }
            
            res.redirect('/usuario01/oferta');
        });
            
    } else {
        res.redirect('/usuario01/loginEstabelecimento');
    }
});

app.post('/filtrar', (req, res) => {
    if (req.session.logado) {
        const filtro = req.body.filtro;

        let ordenacao = 'ASC';
        if (filtro === 'maiorpreco') {
            ordenacao = 'DESC';
        }

        const sql = `
            SELECT pe.*, 
                   FORMAT(pe.preco, 2, 'pt_BR') AS preco,
                   FORMAT(pe.preco_oferta, 2, 'pt_BR') AS preco_oferta,
                   DATE_FORMAT(pe.data_publicacao, '%d/%m/%Y %H:%i') AS data_formatada,
                   te.id_estabelecimento,
                   te.nm_estabelecimento
            FROM produto_estabelecimento pe
            JOIN tb_estabelecimento te ON pe.id_estabelecimento = te.id_estabelecimento
            WHERE pe.descricao LIKE ?
            ORDER BY pe.preco ${ordenacao}
        `;

        const params = [`%${palavraChaveGlobal}%`];

        con.query(sql, params, function (err, result) {
            if (err) throw err;

            
            res.render('produtosPesquisa.ejs', { dadosProduto: result, palavraChaveGlobal, req });
        });
    } else {
        res.redirect('/usuario01/loginUsuario');
    }
});

app.get('/dadosEstabelecimentos', function (req, res) {
    const sql = "SELECT * FROM tb_estabelecimento";

    con.query(sql, function (err, result) {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            res.status(500).json({ error: 'Erro ao buscar dados de estabelecimentos' });
        } else {
            res.json(result);
        }
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
    })
    res.redirect('/usuario01/');
});

app.listen(3102, function () {
    console.log("Servidor Escutando na porta 3102");
});