let subs = []
let txs = []
let fightLogs = []
let fightInterval = 10 //seconds

const fightAddress = $('#fight-address')
const fightResult = $('#table-logs tbody')

async function subscribe (address) {
    console.log('Subscribed:', address)
    subs[address] = setInterval(async() => {
        try {
            const latestBlock = await getLatestBlock()
            const results = await getPastEvents('FightOutcome',
                latestBlock.number-5,
                latestBlock.number,
                '0x39bea96e13453ed52a734b6aceed4c41f57b2271',
                ['0x7a58aac6530017822bf3210fccef7efa31f56277f19966bc887bfb11f40ca96d',
                web3.eth.abi.encodeParameter('address', address)]
                );
            if (results.length > 0) {
                results.forEach(async result => {
                    if (!txs.includes(result.transactionHash)) {
                        const {character, enemyRoll, playerRoll, owner, skillGain, xpGain, weapon} = result.returnValues
                        const tx = await getTransaction(result.transactionHash)
                        const receipt = await getTransactionReceipt(result.transactionHash)
                        const gasCost = tx.gasPrice * receipt.gasUsed
                        fightResult.append(`<tr>
                                                <td class='text-white text-center'>${addressPrivacy(owner)}</td>
                                                <td class='text-white text-center'>${(parseInt(playerRoll) > parseInt(enemyRoll) ? 'Win' : 'Lost')}</td>
                                                <td class='text-white text-center'>${character}</td>
                                                <td class='text-white text-center'>${weapon}</td>
                                                <td class='text-white text-center'>${playerRoll}</td>
                                                <td class='text-white text-center'>${enemyRoll}</td>
                                                <td class='text-white text-center'>${web3.utils.fromWei(BigInt(skillGain).toString(), 'ether')}</td>
                                                <td class='text-white text-center'>${xpGain}</td>
                                                <td class='text-white text-center'>${web3.utils.fromWei(BigInt(gasCost).toString(), 'ether')}</td>
                                            </tr>`)
                        txs.push(result.transactionHash)
                        fightLogs.push(`${owner},${(parseInt(playerRoll) > parseInt(enemyRoll) ? 'Win' : 'Lost')},${character},${weapon},${playerRoll},${enemyRoll},${web3.utils.fromWei(BigInt(skillGain).toString(), 'ether')},${xpGain},${web3.utils.fromWei(BigInt(gasCost).toString(), 'ether')}`)
                    }
                })
            }
        }catch(e) {
            console.log(e)
        }
    }, fightInterval * 1000)
}

async function addAccount() {
  const address = $('#logger-address').val().trim();
  if (!Object.keys(subs).includes(address) && isAddress(address)) {
        await subscribe(address)
        fightAddress.append(`${address}\n`)
        $('#modal-add-account').modal('hide')
    }
}

function exportList() {
  const list = fightAddress.val().split('\n');
  list.splice(list.length-1, 1)
    if (list.length > 0) {
      const textToSave = list.join('\n');
      const textToSaveAsBlob = new Blob([textToSave], {
        type: "text/plain"
      });
      let textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
      const downloadLink = document.createElement("a");
      downloadLink.download = `CBTracker-Address-List-${new Date().getTime()}.txt`;
        downloadLink.innerHTML = "Download File";
        downloadLink.href = textToSaveAsURL;
        downloadLink.onclick = function () {
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
    }
}

function exportLogs() {
    if (fightLogs.length > 0) {
      const textToSave = fightLogs.join('\n');
      const textToSaveAsBlob = new Blob([textToSave], {
        type: "text/plain"
      });
      const textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
      const downloadLink = document.createElement("a");
      downloadLink.download = `CBTracker-Fight-Logs-${new Date().getTime()}.txt`;
        downloadLink.innerHTML = "Download File";
        downloadLink.href = textToSaveAsURL;
        downloadLink.onclick = function () {
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
    }
}

function importList() {
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        return alert('The File APIs are not fully supported in this browser.');
    }

  const input = document.getElementById('file-import');
  if (!input) {
        return alert("Um, couldn't find the fileinput element.");
    }
    if (!input.files) {
        return alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    if (!input.files[0]) {
        return alert("Please select a file before clicking 'Import'");
    }
  const fileType = input.files[0].type;
  if (fileType === 'text/plain') {
      const file = input.files[0];
      const fr = new FileReader();
      fr.readAsText(file);
        fr.addEventListener('load', function () {
          let rows = fr.result.split('\n');
          rows = rows.map(row => row.replace(/\r?\n|\r/g, ''))
            if (rows.length) {
                rows.forEach(async address => {
                    if (!Object.keys(subs).includes(address) && isAddress(address)) {
                        await subscribe(address)
                        fightAddress.append(`${address}\n`)
                    }
                })
            }
            $('#modal-import').modal('hide')
        });
    } else alert("Please import a valid json/text file");
}

function copy_address_to_clipboard() {
    navigator.clipboard.writeText('0x2548696795a3bCd6A8fAe7602fc26DD95A612574').then(n => alert("Copied Address"),e => alert("Fail\n" + e));
}

function addressPrivacy(address) {
    return `${address.substr(0, 6)}...${address.substr(-4, 4)}`
}

window.addEventListener('beforeunload', function (e) {
    if (fightResult.val()) {
        e.preventDefault();
        e.returnValue = 'Your fight logs will be lost. Please save them before closing/refreshing this page';
    }
});

$('#modal-add-account').on('shown.bs.modal', function (e) {
    $('#logger-address').val('')
});
