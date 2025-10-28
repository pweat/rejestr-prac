const bcrypt = require('bcryptjs'); // Używamy bcryptjs, bo taki mamy w server.js
const plainPassword = '3325'; // <-- Wpisz tutaj hasło, którego chcesz używać

// Zmieniamy na bcryptjs, używamy metody synchronicznej dla prostoty
try {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(plainPassword, salt);
  console.log("Twoje zahashowane hasło (skopiuj całą tę linię poniżej):");
  console.log(hash);
} catch (err) {
  console.error("Błąd podczas hashowania:", err);
}