function showWalletInstallPrompt() {
  const links = mobileWeb3.getWalletDownloadLinks();
  if (!links) return;

  const promptHTML = `
    <div id="wallet-prompt" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm">
        <h2 class="text-xl font-semibold mb-4">Web3 Wallet Required</h2>
        <p class="mb-4">To use this app, please install a Web3 wallet like MetaMask or Trust Wallet.</p>
        <div class="flex flex-col space-y-3">
          <a href="${links.metamask}" target="_blank" class="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded">Install MetaMask</a>
          <a href="${links.trust}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">Install Trust Wallet</a>
        </div>
        <button onclick="document.getElementById('wallet-prompt').remove()" class="mt-4 text-sm text-gray-500 underline">Close</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', promptHTML);
}
