FROM python:3.10-slim

WORKDIR /app

# Instala dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas o diretório do backend para o container
COPY backend /app/backend

# Instala as dependências do Python
RUN pip install --no-cache-dir -r backend/requirements.txt

# Define a variável de ambiente para que o Python encontre os módulos na pasta backend
ENV PYTHONPATH=/app/backend

# O Hugging Face Spaces espera que o servidor rode na porta 7860
EXPOSE 7860

# Comando para iniciar o servidor FastAPI
# Note que usamos backend.src.main:app pois o PYTHONPATH inclui /app/backend
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
