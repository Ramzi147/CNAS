# Backend Django CNAS

Stack:
- Django
- Django REST Framework
- JWT avec SimpleJWT
- PostgreSQL

## Installation

```powershell
cd c:\wamp64\www\PFE\backend_django
Copy-Item .env.example .env
py -m pip install -r requirements.txt
py manage.py makemigrations
py manage.py migrate
py manage.py seed_demo
py manage.py createsuperuser
py manage.py runserver
```

## Connexion de demo

- `superadmin@cnas.dz` / `superadmin123`
- `admin@cnas.dz` / `admin123`
- `agent@cnas.dz` / `agent123`
