const makeWASocket = require('@adiwajshing/baileys').default
const { DisconnectReason, useSingleFileAuthState } = require('@adiwajshing/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const xlsx = require('xlsx')
process.env.TZ = 'Asia/Bangkok'
const date = new Date()

const workbook = xlsx.readFile('./data/database.xlsx')
const dataJson =xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

async function connectToWhatsApp () {
    const { state, saveState } = useSingleFileAuthState('./auth.json')
    const sock = makeWASocket({
        // can provide additional config here
        auth: state,
        printQRInTerminal: true
    })
    // this will be called as soon as the credentials are updated
    sock.ev.on('creds.update', saveState)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ' + lastDisconnect.error + ', reconnecting ' + shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        } 
    })
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        
        if(type === 'notify' && !messages[0].key.fromMe){

        //initialize message type
        const message = messages[0].message.conversation
        const responseList = messages[0].message.listResponseMessage
        const responseButton = messages[0].message.buttonsResponseMessage
        const responseReplyButton = messages[0].message.templateButtonReplyMessage
        const number = messages[0].key.remoteJid
        const admin = '6295324443540@s.whatsapp.net'

        // command function for add/send message custom
        const splitted = message.split(/(?<=^\S+)\s/)
        const command = splitted[0]
        const commandMsg = splitted[1]

        console.log(messages, type)

        // get the employee data
        const employee = dataJson.find(data => data.wa == number)
        // start validate 
        if(employee) {
            // functional message
            if(command == '/add') {
                // add new contact to excel via bot nik, nama, panggilan, bagian, status, nomor
                const newContact = commandMsg.split('-')
                dataJson.push({ nik: newContact[0], nama: newContact[1], panggilan: newContact[2], bagian: newContact[3], status: newContact[4], nomor: newContact[5], wa: newContact[5] + '@s.whatsapp.net' })
                xlsx.utils.sheet_add_json(workbook.Sheets[workbook.SheetNames[0]], dataJson)
                xlsx.writeFile(workbook,'./data/database.xlsx')
                await sock.sendMessage(number, { react: {
                    text: "👍",
                    key: messages[0].key
                } })
            } else if(command.toLowerCase()  == 'ot') {
                await sock.sendMessage(admin, { text: commandMsg })
            } else if(responseList) {
                // handle response list
                const listId = responseList.singleSelectReply.selectedRowId

                // formulir
                const buttons = [
                    {buttonId: 'form-angket-transport', buttonText: {displayText: 'Angket Transport'}, type: 1},
                    {buttonId: 'form-cka', buttonText: {displayText: 'Cuti Karena Alasan Khusus'}, type: 1},
                    {buttonId: 'form-cuti-mpp', buttonText: {displayText: 'Cuti MPP'}, type: 1},
                    // {buttonId: 'form-flextime', buttonText: {displayText: 'Flexible Worktime'}, type: 1},
                    // {buttonId: 'form-id-card', buttonText: {displayText: 'Ganti ID Card'}, type: 1},
                    // {buttonId: 'form-incomplete', buttonText: {displayText: 'Incomplete Absen'}, type: 1},
                    // {buttonId: 'form-obat-alternatif', buttonText: {displayText: 'Pengobatan Alternatif'}, type: 1},
                    // {buttonId: 'form-pensiun-dini', buttonText: {displayText: 'Pensiun Dini'}, type: 1},
                    // {buttonId: 'form-norek', buttonText: {displayText: 'Pergantian Nomor Rekening'}, type: 1},
                    // {buttonId: 'form-jatah-obat', buttonText: {displayText: 'Permohonan Jatah Obat'}, type: 1},
                    // {buttonId: 'form-pinjaman', buttonText: {displayText: 'Pinjaman Perusahaan'}, type: 1},
                    // {buttonId: 'form-resign', buttonText: {displayText: 'Surat Resign'}, type: 1},
                    // {buttonId: 'form-tanggungan-anak', buttonText: {displayText: 'Tanggungan Obat Keluarga'}, type: 1},
                    // {buttonId: 'form-uang-pensiun', buttonText: {displayText: 'Uang Muka Pensiun'}, type: 1}
                  ]
                  
                  const buttonFormMessage = {
                      text: "Silahkan pilih formulir yang anda butuhkan",
                      buttons: buttons,
                      headerType: 1
                  }

                if (listId == 'form') {
                    await sock.sendMessage(number, buttonFormMessage)
                }
                // end formulir
            } else if(responseButton) {
                // handle response button
                const buttonId = responseButton.selectedButtonId

                switch (buttonId) {
                    case 'form-angket-transport':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Angket Transport.pdf'), fileName: 'Angket Transport' })
                        break;
                    case 'form-cka':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Cuti Karena Alasan Khusus.pdf'), fileName: 'Permohonan Cuti Karena Melahirkan (CKA)' })
                        break;
                    case 'form-cuti-mpp':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Cuti MPP.pdf'), fileName: 'Permohonan Cuti Masa Persiapan Pensiun (MPP)' })
                        break;
                    // case 'form-flextime':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Flexible Worktime.pdf'), fileName: 'Formulir Flexible Working Time' })
                    //     break;
                    // case 'form-id-card':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Ganti ID Card.pdf'), fileName: 'Surat Pernyataan Kehilangan / Permohonan ID Card' })
                    //     break;
                    // case 'form-incomplete':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Incomplete Absen.pdf'), fileName: 'Laporan Absensi' })
                    //     break;
                    // case 'form-obat-alternatif':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pengobatan Alternatif.pdf'), fileName: 'Surat Pernyataan Mengajukan Pengobatan Alternatif' })
                    //     break;
                    // case 'form-pensiun-dini':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pensiun Dini.pdf'), fileName: 'Surat Permohonan Pensiun Dini' })
                    //     break;
                    // case 'form-norek':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pergantian Nomor Rekening.pdf'), fileName: 'Surat Pernyataan Pergantian Nomor Rekening' })
                    //     break;
                    // case 'form-jatah-obat':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Permohonan Jatah Obat.pdf'), fileName: 'Permohonan Pengajuan Tunjangan Pengobatan' })
                    //     break;
                    // case 'form-pinjaman':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pinjaman Perusahaan.pdf'), fileName: 'Perjanjian Pinjaman' })
                    //     break;
                    // case 'form-resign':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Surat Resign.pdf'), fileName: 'Surat Pengunduran Diri' })
                    //     break;
                    // case 'form-tanggungan-anak':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Tanggungan Obat Keluarga.pdf'), fileName: 'Surat Pernyataan Tanggungan Pengobatan Keluarga' })
                    //     break;
                    // case 'form-pensiun':
                    //     await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Uang Muka Pensiun.pdf'), fileName: 'Permohonan Uang Muka Pensiun' })
                    //     break;
                }


            } else {
                const desc = `${employee.panggilan}\n` 
                            + 'Selamat datang di pesan otomatis HR-GA\n'
                            + 'Apakah ada yang bisa kami bantu ?\n' 
                const sections = [
                    {
                    title: "HR",
                    rows: [
                        {title: " 1", rowId: "1"},
                        {title: "Formulir", rowId: "form"}
                    ]
                    },
                    {
                    title: "GA",
                    rows: [
                        {title: " 3", rowId: "3"},
                        {title: " 4", rowId: "4"}
                    ]
                    },
                ]
                
                const listMessage = {
                    title: 'Semangat Pagi 😎\n',
                    text: desc,
                    buttonText: "Menu",
                    sections
                }

                await sock.sendMessage(number, listMessage)
            }

            // end of validate
        } else {
            await sock.sendMessage(number, { text: 'Maaf hanya karyawan PT. Sugity Creatives saja yang bisa mengakses' })
        }
        

        }
    })
}
// run in main file
connectToWhatsApp()