const fs = require('fs');

function fix(file) {
    let str = fs.readFileSync(file, 'utf8');
    // replace mojibake
    str = str.replace(/Äang táº¡o phÃ²ng\.\.\./g, 'Đang tạo phòng...');
    str = str.replace(/Äang chá»\.\.\./g, 'Đang chờ...');
    str = str.replace(/TÃ¡ÂºÂ¡o PhÃƒÂ²ng/g, 'Tạo Phòng');
    str = str.replace(/MÃƒÂ£ 4 sÃ¡Â»â€˜\.\.\./g, 'Mã 4 số...');
    str = str.replace(/VÃƒÂ o/g, 'Vào');

    let isMojibaked = str.includes('Ã') || str.includes('Ä') || str.includes('º');
    
    if (isMojibaked) {
       // if there's extensive mojibake, maybe read as latin1 and write as utf8
       let raw = fs.readFileSync(file, 'binary');
       let decoded = Buffer.from(raw, 'latin1').toString('utf8');
       if (decoded.includes('Đang tạo phòng') || decoded.includes('Đang chờ') || decoded.includes('hợp lệ')) {
           fs.writeFileSync(file, decoded, 'utf8');
           console.log(file + ' fully decoded');
           return;
       }
    }
    
    fs.writeFileSync(file, str, 'utf8');
    console.log(file + ' text replaced');
}

fix('public/js/main.js');
fix('server/index.js');