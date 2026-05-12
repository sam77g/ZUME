CREATE DATABASE users_data ;

USE users_data ;

CREATE TABLE usuarios(
    id INT AUTO_INCREMENT PRIMARY KEY ,
    senha VARCHAR(255) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    nome
);
