# MillPro ML Module

This folder contains the machine learning pipeline for MillPro's forecasting feature.

## Purpose
Detects patterns in historical milling, sales, and inventory data to predict future demand/yield, and provides results to the backend team via a simple output (JSON/API-ready).

## Structure
- `data_prep.py` — pulls and cleans data for training
- `train_model.py` — trains the forecasting model
- `predict.py` — generates predictions from the trained model (added later)

## Status
🚧 In development — Emily (AI/ML Developer)

## How it fits in
Backend devs can call the output of this pipeline to serve forecasts through the existing REST API.