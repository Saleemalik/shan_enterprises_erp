pip install -r requirements.txt
python manage.py migrate erp 0003 --fake
python manage.py migrate
mkdir -p static
python manage.py collectstatic --noinput
python manage.py createsuperuser --noinput || true
