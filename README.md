
# Projeto Integrador II - PUC Campinas - 2025

Projeto (Final) Integrador do Curso de Engenharia de Software do 2º Semestre do ano de 2025



## Instalação do Banco de Dados

Configurar o Banco de Dados no MySQL (copie o código abaixo e execute em uma query no MySQL Workbench)

```sql
CREATE database pi2;
use pi2;

CREATE TABLE USUARIO (
id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_usuario VARCHAR(255) NOT NULL,
email VARCHAR(255) UNIQUE NOT NULL,
telefone VARCHAR(50),
senha VARCHAR(255) NOT NULL
);

CREATE TABLE INSTITUICAO (
id_instituicao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_instituicao VARCHAR(255) NOT NULL,
fk_usuario_id_usuario INT UNSIGNED NOT NULL
);

CREATE TABLE CURSO (
id_curso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_curso VARCHAR(255) NOT NULL,
fk_instituicao_id_instituicao INT UNSIGNED NOT NULL
);

CREATE TABLE DISCIPLINA (
id_disciplina INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_disciplina VARCHAR(255) NOT NULL,
sigla VARCHAR(50),
codigo VARCHAR(50),
periodo VARCHAR(50),
formula_calculo TEXT,
fk_curso_id_curso INT UNSIGNED NOT NULL
);

CREATE TABLE TURMA (
id_turma INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_turma VARCHAR(255) NOT NULL,
fk_disciplina_id_disciplina INT UNSIGNED NOT NULL
);

CREATE TABLE ALUNO (
id_aluno INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_completo VARCHAR(255) NOT NULL,
matricula VARCHAR(255) NOT NULL
);

CREATE TABLE COMPONENTE_NOTA (
id_componente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
nome_componente VARCHAR(255) NOT NULL,
sigla VARCHAR(50),
descricao TEXT,
fk_disciplina_id_disciplina INT UNSIGNED NOT NULL
);

CREATE TABLE REGISTRO_NOTA (
valor_nota DECIMAL(4,2),
fk_componente_nota_id_componente INT UNSIGNED,
fk_aluno_id_aluno INT UNSIGNED,
fk_turma_id_turma INT UNSIGNED,
PRIMARY KEY (fk_componente_nota_id_componente, fk_aluno_id_aluno)
);

CREATE TABLE AUDITORIA_NOTA (
valor_antigo DECIMAL(4,2),
valor_novo DECIMAL(4,2),
data_hora DATETIME,
mensagem TEXT,
id_log INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE MATRICULA_TURMA (
valor_final_calculado DECIMAL(4,2),
valor_ajustado DECIMAL(4,2),
opcao_ajustada BOOLEAN,
fk_turma_id_turma INT UNSIGNED,
fk_aluno_id_aluno INT UNSIGNED,
PRIMARY KEY (fk_turma_id_turma, fk_aluno_id_aluno)
);

ALTER TABLE INSTITUICAO ADD CONSTRAINT FK_INSTITUICAO_2
FOREIGN KEY (fk_usuario_id_usuario)
REFERENCES USUARIO (id_usuario)
ON DELETE CASCADE;
ALTER TABLE CURSO ADD CONSTRAINT FK_CURSO_2
FOREIGN KEY (fk_instituicao_id_instituicao)
REFERENCES INSTITUICAO (id_instituicao)
ON DELETE RESTRICT;
ALTER TABLE DISCIPLINA ADD CONSTRAINT FK_DISCIPLINA_2
FOREIGN KEY (fk_curso_id_curso)
REFERENCES CURSO (id_curso)
ON DELETE RESTRICT;
ALTER TABLE TURMA ADD CONSTRAINT FK_TURMA_2
FOREIGN KEY (fk_disciplina_id_disciplina)
REFERENCES DISCIPLINA (id_disciplina)
ON DELETE RESTRICT;
ALTER TABLE COMPONENTE_NOTA ADD CONSTRAINT FK_COMPONENTE_NOTA_2
FOREIGN KEY (fk_disciplina_id_disciplina)
REFERENCES DISCIPLINA (id_disciplina)
ON DELETE RESTRICT;
ALTER TABLE REGISTRO_NOTA ADD CONSTRAINT FK_REGISTRO_NOTA_1
FOREIGN KEY (fk_componente_nota_id_componente)
REFERENCES COMPONENTE_NOTA (id_componente);
ALTER TABLE REGISTRO_NOTA ADD CONSTRAINT FK_REGISTRO_NOTA_2
FOREIGN KEY (fk_aluno_id_aluno)
REFERENCES ALUNO (id_aluno);
ALTER TABLE MATRICULA_TURMA ADD CONSTRAINT FK_MATRICULA_TURMA_2
FOREIGN KEY (fk_turma_id_turma)
REFERENCES TURMA (id_turma);
ALTER TABLE MATRICULA_TURMA ADD CONSTRAINT FK_MATRICULA_TURMA_3
FOREIGN KEY (fk_aluno_id_aluno)
REFERENCES ALUNO (id_aluno);
```

## Instalação do Node (caso não esteja instalado)

Visite o website oficial do Node.js [clicando aqui](https://nodejs.org/en/download) para fazer o download dos pacotes do Node.js e instalar em sua máquina.

## Configuração do Node no projeto
Abra o CMD do Windows ou o Terminal do Mac/Linux e abra o diretório do backend:
```console
cd path\to\GitHub Modified\project_nota_dez\backend
```
Após isso, inicie o módulo do Node dentro da pasta backend e instale as dependências necessárias:
```console
npm init
(dê enter até finalizar)
npm install
npm install mysql2
```

## Configuração do .env
No arquivo `.env`, você deve incluir os seguintes dados:
### Para a funcionalidade de recuperação de senha
Ter uma conta válida da Google e gerar uma senha de app para ser usada, e incluir os seguintes dados:
```env
PORT=3000
EMAIL_USER=<DIGITE O E-MAIL AQUI (SEM AS <>)>
EMAIL_PASS=<DIGITE A SENHA DE APP AQUI (SEM AS <>)>
URL_BASE=http://localhost:3000
```
### Para a conexão e funcionamento do BD (obrigatório)
Para o sistema rodar, é preciso conectar com o BD MySQL:
```env
DB_HOST=<GERALMENTE localhost OU OUTRO HOST>
DB_PORT=<GERALMENTE 3306 OU OUTRA PORTA>
DB_USER=<NOME DE USUÁRIO DO MYSQL>
DB_PASS=<SENHA DO USUÁRIO DO MYSQL>
DB_NAME=pi2
```


## Iniciação
Depois de Instalar e Configurar o sistema, é preciso iniciá-lo. Dentro da pasta backend no CMD ou Terminal, execute o seguinte código:
```console
npm run dev
```
E acesse o site indicado como resultado.
A mior parte dos erros, principalmente de BD, terão seus logs registrados na mesma janela do CMD ou Terminal.

Para finalizar o processo e fechar o servido, aperte dentro do CMD/Terminal `ctrl + D`.