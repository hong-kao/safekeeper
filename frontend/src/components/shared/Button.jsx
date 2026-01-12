export const Button = ({ children, ...props }) => (
    <button {...props} style={{ padding: '10px', marginRight: '10px', marginBottom: '10px' }}>
        {children}
    </button>
);
