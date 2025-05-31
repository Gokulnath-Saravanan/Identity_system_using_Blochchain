const IdentityManager = artifacts.require("IdentityManager");

module.exports = function(deployer, network, accounts) {
  console.log("Deploying IdentityManager contract...");
  console.log("Network:", network);
  console.log("Deployer account:", accounts[0]);
  
  deployer.deploy(IdentityManager)
    .then(() => {
      console.log("IdentityManager deployed successfully!");
      console.log("Contract address:", IdentityManager.address);
    })
    .catch(error => {
      console.error("Deployment failed:", error);
    });
};