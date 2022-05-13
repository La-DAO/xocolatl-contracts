## Que es Xocolatl ? $XOC
<br/>

Xocolatl es un protocolo decentralizado, en fase prototipo, para acuñar tokens ERC20 con paridad 1:1 al peso mexicano (MXN) y puedan ser utilizados en la economía Web3.  

Xocolatl ha surgido para ayudar a los mexicanos a transicionar a la web3.  

Los contribuidores de Xocolatl queremos crear la moneda que de entrada a México para integrarse a la economía decentralizada popularmente conocida como "DeFi".  

## México y DeFi
<br/>

A pesar de que las monedas estables como DAI, USDC y USDT han empoderado las finanzas decentralizadas (DeFi) desde el 2017, México y el peso Mexicano en específico no han dado un paso adelante.  

XOC es el primer cimiento en el ecosistema del país que permitirá al mexicano/a accesar a nuevas herramientas financieras que estan revolucionando la economia global.  

Uno de los muchos motivos por los que creemos que XOC es un moneda necesaria, es para facilitar el flujo de capital sin restricciones entre México y los Estados Unidos.  


## El PípilaDAO
<br/>

Las Organizaciones Autonomas Decentralizadas (DAO en inglés) son cooperativas digitales que permiten a un conjunto de personas coolaborar en un proyecto sin importar quienes sean, de donde vienen, en que creen, o en donde residen.  

En este caso, PipilaDAO es creada para ser la organizacion encargada para el desarrollo y control de la moneda decentralizada XOC.  

Todos son bienvenidos a contribuir y se utiliza Coordinape para que por medio de un sistema de evaluacion social, la contribución de cada integrante en PípilaDAO sea de manera abierta, facil y transparente.
<br/>
<br/>
<br/>

---

## Temas Technicos (Technical Subjects)

---
<br/>

### Como correr las pruebas del Oraculo? (How to run oracle tests?)
<br/>

In a directory, clone the repository locally:

> git clone https://github.com/PipilaDAO/xocolatl  

Install all dependencies:  

> yarn install

In a seperate terminal start a local node by running:

> npx hardhat node

Then run tests with:

> npx hardhat --network localhost test ./test/redstone_tests.js

---