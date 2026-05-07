# Use Feature-Sliced Design For Frontend And App Organization

The dashboard uses Feature-Sliced Design layer direction (`app -> pages -> widgets -> features -> entities -> shared`) to keep route wiring, page workflows, reusable domain concepts, and infrastructure separated. New behavior should start in the owning page slice unless reuse is real, and cross-slice imports should go through public slice interfaces.
