import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import numpy as np

df = pd.read_csv("input/Traces(1).csv", header=None, names=["particle", "time", "x", "y"])

particles = df["particle"].unique()
colors = cm.tab20(np.linspace(0, 1, len(particles)))

fig, axes = plt.subplots(1, 2, figsize=(16, 7))

# Left: spatial traces
ax1 = axes[0]
for i, pid in enumerate(particles):
    p = df[df["particle"] == pid]
    ax1.plot(p["x"], p["y"], "-o", color=colors[i], markersize=3, label=f"Particle {pid}")
    ax1.annotate("start", (p["x"].iloc[0], p["y"].iloc[0]), fontsize=7, color=colors[i])
ax1.set_xlabel("X")
ax1.set_ylabel("Y")
ax1.set_title("Particle Traces (X vs Y)")
ax1.legend(fontsize=7, loc="best")
ax1.set_aspect("equal")
ax1.grid(True, alpha=0.3)

# Right: x and y over time
ax2 = axes[1]
for i, pid in enumerate(particles):
    p = df[df["particle"] == pid]
    ax2.plot(p["time"], p["x"], "-", color=colors[i], alpha=0.8, label=f"P{pid} x")
    ax2.plot(p["time"], p["y"], "--", color=colors[i], alpha=0.5, label=f"P{pid} y")
ax2.set_xlabel("Time step")
ax2.set_ylabel("Position")
ax2.set_title("Position over Time")
ax2.legend(fontsize=6, loc="best", ncol=2)
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
