# Passo a passo CMD — subir no GitHub e publicar no Netlify

Abra o CMD ou PowerShell dentro da pasta do projeto.

## 1. Entrar na pasta

```bat
cd C:\Users\SEU_USUARIO\Downloads\step_painel_obras_netlify_v5
```

## 2. Iniciar Git

```bat
git init
git add .
git commit -m "Painel STEP Obras Netlify v5"
```

## 3. Conectar ao GitHub

Crie antes um repositório vazio no GitHub, por exemplo:

```text
step-painel-obras
```

Depois rode, trocando pelo seu usuário/repositório:

```bat
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/step-painel-obras.git
git push -u origin main
```

## 4. Publicar no Netlify

No Netlify:

1. Add new site
2. Import an existing project
3. GitHub
4. Selecione o repositório
5. Build command: deixe vazio
6. Publish directory: `.`
7. Deploy

## 5. Atualizar depois

Sempre que alterar arquivos:

```bat
git add .
git commit -m "Atualiza painel STEP"
git push
```

O Netlify atualiza automaticamente após o push.
