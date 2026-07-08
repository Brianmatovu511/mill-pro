import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

# Simulate 45 days of production data, matching MillPro's real data patterns
# (maize input, flour/bran yield %, waste — based on actual seed data ranges)
np.random.seed(42)  # for consistent, reproducible results

days = 45
maize_in = np.random.randint(900, 2400, size=days)
yield_pct = np.random.uniform(0.68, 0.77, size=days)
flour_out = (maize_in * yield_pct).round()

df = pd.DataFrame({
    "day": range(1, days + 1),
    "maize_in": maize_in,
    "flour_out": flour_out
})

# Train a simple model: predict flour output from maize input
X = df[["maize_in"]]
y = df["flour_out"]
model = LinearRegression()
model.fit(X, y)

# Example prediction: if we know tomorrow's maize input, forecast flour output
next_maize_in = pd.DataFrame({"maize_in": [1800]})
prediction = model.predict(next_maize_in)

print(f"Trained on {days} days of production data")
print(f"Model coefficient (flour yield rate): {model.coef_[0]:.2f}")
print(f"Predicted flour output for 1800kg maize input: {prediction[0]:.0f} kg")