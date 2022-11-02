const makeWASocket = require('@adiwajshing/baileys').default
const { DisconnectReason, useSingleFileAuthState } = require('@adiwajshing/baileys')
const { Boom } = require('@hapi/boom')
let overtimes = require('./overtime.json')
const fs = require('fs')
const xlsx = require('xlsx')
process.env.TZ = 'Asia/Bangkok'
const date = new Date()
const express = require('express')
require('dotenv').config()
const app = express()

const workbook = xlsx.readFile('./data/database.xlsx')
const dataJson = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

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
        const admin = '62895324443540@s.whatsapp.net'

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
            if(command == '/add' && employee.status == 'admin') {
                // add new contact to excel via bot nik, nama, panggilan, bagian, status, nomor
                const newContact = commandMsg.split('-')
                dataJson.push({ nik: newContact[0], nama: newContact[1], panggilan: newContact[2], bagian: newContact[3], status: newContact[4], nomor: newContact[5], wa: newContact[5] + '@s.whatsapp.net' })
                xlsx.utils.sheet_add_json(workbook.Sheets[workbook.SheetNames[0]], dataJson)
                xlsx.writeFile(workbook,'./data/database.xlsx')
                await sock.sendMessage(number, { react: {
                    text: "👍",
                    key: messages[0].key
                } })
            } else if(employee.status == 'admin' && message.toLowerCase() == 'get overtime') {
                let overtime = []
                let merging = []
                let totalOtHour = 0
                overtimes.map(data => {
                    if(data.keterangan) {
                        overtime.push(data)
                    }
                })
                overtime.map(data => {
                    let merge = `${data.nama} \nLembur : ${data.jam} Jam \nPekerjaan : ${data.keterangan}\n`
                    merging.push(merge)
                    totalOtHour += parseInt(data.jam)
                })
                let merged = merging.join('\n') + `\n *Total MP* : *${overtime.length} Orang*` + `\n *Total Jam* : *${totalOtHour} Jam*`

                await sock.sendMessage(number, { text: merged })
            } else if(employee.status == 'admin' && message.toLowerCase() == 'delete overtime') {
                overtimes = []
                fs.writeFileSync('./overtime.json', JSON.stringify(overtimes, null, 2))
                await sock.sendMessage(number, { text: 'Data Overtime berhasil dihapus' })
            } else if(employee.status == 'admin' && message.toLowerCase()  == 'start ot') {
              // OT START
                sock.sendMessage(number, { text: 'Mengirim pesan ke member ✓' })
                dataJson.map(async hr => {
                    const OTsections = [
                        {
                        rows: [
                            {title: 'Teiji', rowId: 'teiji'},
                            {title: '1 Jam', rowId: 1},
                            {title: '2 Jam', rowId: 2},
                            {title: '3 Jam', rowId: 3},
                            {title: '4 Jam', rowId: 4},
                            {title: '5 Jam', rowId: 5},
                        ]
                        }
                    ]
                    const OTlistMessage = {
                        title: `Selamat Siang ${hr.panggilan}`,
                        text: `Hari ini lembur tidak ya?`,
                        buttonText: 'Klik untuk menjawab',
                        sections: OTsections
                    }
                    if(hr.status == 'peserta' || hr.status == 'admin') await sock.sendMessage(hr.wa , OTlistMessage)
                })   
            } else if(responseList) {
                // handle response list
                const listId = responseList.singleSelectReply.selectedRowId
                console.log(listId)

                // formulir
                switch (listId) {
                    case 'form':
                        const formSections = [
                            {
                                rows: [
                                    {rowId: 'form-angket-transport', title: 'Angket Transport' },
                                    {rowId: 'form-cka', title: 'Cuti Karena Alasan Khusus' },
                                    {rowId: 'form-cuti-mpp', title: 'Cuti MPP' },
                                    {rowId: 'form-flextime', title: 'Flexible Worktime' },
                                    {rowId: 'form-id-card', title: 'Ganti ID Card' },
                                    {rowId: 'form-incomplete', title: 'Incomplete Absen' },
                                    {rowId: 'form-obat-alternatif', title: 'Pengobatan Alternatif' },
                                    {rowId: 'form-pensiun-dini', title: 'Pensiun Dini' },
                                    {rowId: 'form-norek', title: 'Pergantian Nomor Rekening' },
                                    {rowId: 'form-jatah-obat', title: 'Permohonan Jatah Obat' },
                                    {rowId: 'form-pinjaman', title: 'Pinjaman Perusahaan' },
                                    {rowId: 'form-resign', title: 'Surat Resign' },
                                    {rowId: 'form-tanggungan-anak', title: 'Tanggungan Obat Keluarga' },
                                    {rowId: 'form-uang-pensiun', title: 'Uang Muka Pensiun' }
                                ]
                            }
                          ]
                          
                          const formListMessage = {
                              text: 'Silahkan pilih formulir yang anda butuhkan',
                              buttonText: 'Pilih Formulir',
                              sections: formSections
                          }
                          
                          sock.sendMessage(number, formListMessage)
                          break;
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
                    case 'form-flextime':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Flexible Worktime.pdf'), fileName: 'Formulir Flexible Working Time' })
                        break;
                    case 'form-id-card':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Ganti ID Card.pdf'), fileName: 'Surat Pernyataan Kehilangan / Permohonan ID Card' })
                        break;
                    case 'form-incomplete':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Incomplete Absen.pdf'), fileName: 'Laporan Absensi' })
                        break;
                    case 'form-obat-alternatif':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pengobatan Alternatif.pdf'), fileName: 'Surat Pernyataan Mengajukan Pengobatan Alternatif' })
                        break;
                    case 'form-pensiun-dini':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pensiun Dini.pdf'), fileName: 'Surat Permohonan Pensiun Dini' })
                        break;
                    case 'form-norek':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pergantian Nomor Rekening.pdf'), fileName: 'Surat Pernyataan Pergantian Nomor Rekening' })
                        break;
                    case 'form-jatah-obat':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Permohonan Jatah Obat.pdf'), fileName: 'Permohonan Pengajuan Tunjangan Pengobatan' })
                        break;
                    case 'form-pinjaman':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Pinjaman Perusahaan.pdf'), fileName: 'Perjanjian Pinjaman' })
                        break;
                    case 'form-resign':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Surat Resign.pdf'), fileName: 'Surat Pengunduran Diri' })
                        break;
                    case 'form-tanggungan-anak':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Tanggungan Obat Keluarga.pdf'), fileName: 'Surat Pernyataan Tanggungan Pengobatan Keluarga' })
                        break;
                    case 'form-pensiun':
                        await sock.sendMessage(number, { text: 'Mohon tunggu sedang mengirim file' })
                        await sock.sendMessage(number, { document: fs.readFileSync('./data/form/Uang Muka Pensiun.pdf'), fileName: 'Permohonan Uang Muka Pensiun' })
                        break;
                    case 'teiji':
                        sock.sendMessage(number, { text: `Terimakasih ${employee.panggilan} ^_^\n Data telah terkirim` })
                        break;
                    }
                    
                    if (listId == 1 || listId == 2 || listId == 3 || listId == 4 || listId == 5) {
                        overtimes.push({ nama: employee.nama, jam: listId })
                        const msg = `Job nya apa ya ${employee.panggilan} ?\n\n` 
                            + 'Jawab dengan format : \n\n'
                            + 'Job(spasi)Jawaban' 
                        sock.sendMessage(number, { text: msg }).then( async () => {
                            fs.writeFileSync('./overtime.json', JSON.stringify(overtimes, null, 2))
                        })

                    
                    }
            } else if(responseButton) {
                // handle response button
                const buttonId = responseButton.selectedButtonId
            } else if(employee.bagian == 'HR' && command.toLowerCase() == 'job') {
                const user = overtimes.find(data => data.nama == employee.nama)
                overtimes.slice(user.nama == employee.nama)
                overtimes.push({ nama: user.nama, jam: user.jam, keterangan: commandMsg})
                fs.writeFileSync('./overtime.json', JSON.stringify(overtimes, null, 2))
                sock.sendMessage(number, { text: `Terimakasih ${employee.panggilan} ^_^\n Data telah terkirim` })
            } else if(message.toLowerCase() == 'bot' || message.toLowerCase() == 'p') {
                const desc = `${employee.panggilan}\n` 
                            + 'Selamat datang di pesan otomatis HR-GA\n'
                            + 'Apakah ada yang bisa kami bantu ?\n' 
                const sections = [
                    {
                    title: 'HR',
                    rows: [
                        // {title: ' 1', rowId: '1'},
                        {title: 'Formulir', rowId: 'form', description: 'Transport, CKA, MPP, ID Card, Jatah Obat, dll'}
                    ]
                    },
                    // {
                    // title: 'GA',
                    // rows: [
                    //     {title: ' 3', rowId: '3'},
                    //     {title: ' 4', rowId: '4'}
                    // ]
                    // },
                ]
                
                const listMessage = {
                    title: 'Semangat Pagi 💪😁\n',
                    text: desc,
                    buttonText: "Menu",
                    sections
                }

                await sock.sendMessage(number, listMessage)
            }

            // end of validate
        } else if(message.toLowerCase() == 'bot' || message.toLowerCase() == 'p') {
            await sock.sendMessage(number, { text: 'Maaf hanya karyawan PT. Sugity Creatives saja yang bisa mengakses' })
        }
        

        }
    })
}
// run in main file
connectToWhatsApp()

app.listen(process.env.PORT || 8000, () => {
    console.log('Bot Sugity Ready!')
})