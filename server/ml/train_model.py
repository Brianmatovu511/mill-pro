import pandas as pd
from sklearn.linear_model import LinearRegression

# Sample data: past monthly flour output (in kg)
data = {
    "month": [1, 2, 3, 4, 5, 6],
    "output_kg": [1000, 1100, 1050, 1200, 1250, 1300]
}
df = pd.DataFrame(data)

# Train a simple model
X = df[["month"]]
y = df["output_kg"]
model = LinearRegression()
model.fit(X, y)

# Predict next month
next_month = pd.DataFrame({"month": [7]})
prediction = model.predict(next_month)
print(f"Predicted output for month 7: {prediction[0]:.0f} kg")