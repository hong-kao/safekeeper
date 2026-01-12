export const Navigation = ({ currentPage, setCurrentPage }) => (
    <div>
        <h1>SafeKeeper</h1>
        <nav>
            <button onClick={() => setCurrentPage('buy')}>Buy Insurance</button>
            <button onClick={() => setCurrentPage('pool')}>Pool Status</button>
            <button onClick={() => setCurrentPage('risk')}>Risk Simulator</button>
        </nav>
        <hr />
    </div>
);
