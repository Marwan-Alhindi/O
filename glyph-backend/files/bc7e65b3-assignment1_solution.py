import numpy as np
import matplotlib.pyplot as plt

# ─── PROBLEM 1 ───────────────────────────────────────────────────────────────
# f(x) = 3x1^2 - 2x1*x2 + x2^2 - x1 + 2*x2 + 1
# Canonical form: f(x) = (1/2) x^T A x + b^T x + c
A = np.array([[6, -2],
              [-2, 2]], dtype=float)
b = np.array([-1.0, 2.0])
c = 1.0

def f_quad(x):
    return 0.5 * x @ A @ x + b @ x + c

# Minimizer: A x* + b = 0  =>  x* = -A^{-1} b
x_star = np.linalg.solve(A, -b)
print("Minimizer:", x_star)
print("Eigenvalues of A:", np.linalg.eigvalsh(A))  # both > 0 => local (global) min

# Contour plot
x1 = np.linspace(-1.5, 1.0, 400)
x2 = np.linspace(-2.5, 0.5, 400)
X1, X2 = np.meshgrid(x1, x2)
F = 3*X1**2 - 2*X1*X2 + X2**2 - X1 + 2*X2 + 1

fig, ax = plt.subplots()
cp = ax.contour(X1, X2, F, levels=np.linspace(F.min(), F.min()+8, 25), cmap="viridis")
ax.clabel(cp, fmt="%.2f", fontsize=7)
ax.plot(*x_star, "r*", ms=14, label=f"Min ({x_star[0]:.3f},{x_star[1]:.3f})")
ax.set_xlabel("x1"); ax.set_ylabel("x2")
ax.set_title("Problem 1 - Quadratic Contour"); ax.legend()
plt.tight_layout(); plt.savefig("prob1_contour.png", dpi=150); plt.close()

# ─── PROBLEM 2 ───────────────────────────────────────────────────────────────
def rosenbrock(x):
    return 10*(x[1] - x[0]**2)**2 + (1 - x[0])**2

x1 = np.linspace(-2, 2, 600); x2 = np.linspace(-1, 3, 600)
X1, X2 = np.meshgrid(x1, x2)
FR = 10*(X2 - X1**2)**2 + (1 - X1)**2
fig, ax = plt.subplots()
cp = ax.contour(X1, X2, FR, levels=np.logspace(-1, 3, 30), cmap="plasma")
ax.clabel(cp, fmt="%.1f", fontsize=7)
ax.plot(1, 1, "r*", ms=14, label="Min (1,1)")
ax.set_xlabel("x1"); ax.set_ylabel("x2")
ax.set_title("Problem 2 - Rosenbrock Contour"); ax.legend()
plt.tight_layout(); plt.savefig("prob2_rosenbrock.png", dpi=150); plt.close()

# ─── PROBLEM 3 ───────────────────────────────────────────────────────────────
def rosen_grad(x):
    """Gradient of the Rosenbrock function.
    df/dx1 = -40*x1*(x2 - x1^2) - 2*(1 - x1)
    df/dx2 =  20*(x2 - x1^2)
    """
    g1 = -40*x[0]*(x[1] - x[0]**2) - 2*(1 - x[0])
    g2 =  20*(x[1] - x[0]**2)
    return np.array([g1, g2])

# ─── PROBLEM 4 ───────────────────────────────────────────────────────────────
def steepest_descent_bt(fun, grad, x0, tol=1e-5, max_iter=100000,
                        alpha0=1.0, rho=0.5, c1=1e-4):
    """Steepest descent with Armijo backtracking line search."""
    x = x0.copy().astype(float)
    f_history, gnorm_history = [fun(x)], [np.linalg.norm(grad(x))]
    for k in range(max_iter):
        g = grad(x); gnorm = np.linalg.norm(g)
        if gnorm < tol:
            print(f"Converged in {k} iterations"); break
        d = -g
        alpha = alpha0; f0 = fun(x); slope = np.dot(g, d)
        while fun(x + alpha*d) > f0 + c1*alpha*slope:
            alpha *= rho
        x = x + alpha*d
        f_history.append(fun(x)); gnorm_history.append(np.linalg.norm(grad(x)))
    return x, np.array(f_history), np.array(gnorm_history)

x0 = np.array([-1.2, 1.0])
x_opt, f_hist, gnorm_hist = steepest_descent_bt(rosenbrock, rosen_grad, x0)
print("Minimizer:", x_opt)

# ─── PROBLEM 5 ───────────────────────────────────────────────────────────────
error = np.abs(f_hist - 0.0)
fig, ax = plt.subplots()
ax.semilogy(error, color="steelblue", lw=1.5)
ax.set_xlabel("Iteration k"); ax.set_ylabel("|f_k - f*|")
ax.set_title("Problem 5 - Convergence of Steepest Descent"); ax.grid(True, which="both")
plt.tight_layout(); plt.savefig("prob5_convergence.png", dpi=150); plt.close()
