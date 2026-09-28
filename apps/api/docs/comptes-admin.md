### 1. Générer le hash


```bash
node -e "console.log(require('bcrypt').hashSync(process.argv[1], 10))" 'TON_MOT_DE_PASSE'
```


### 2. Insérer la ligne


```sql
INSERT INTO users (email, password, role)
VALUES ('toi@exemple.com', '$2b$10$LE_HASH_COLLE_ICI', 'admin')
ON CONFLICT (email) DO UPDATE
  SET role = 'admin', password = EXCLUDED.password;
```
