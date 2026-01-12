import { usePool } from '../../hooks/usePool';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Button } from '../shared/Button';

export const PoolStatus = () => {
    const { poolData, loading, error, refetch } = usePool();
    const { connected: wsConnected, events } = useWebSocket();

    const formatWei = (wei) => {
        if (!wei) return '0';
        try {
            const value = BigInt(wei);
            return (value / BigInt(10 ** 18)).toString() + ' ETH';
        } catch {
            return wei;
        }
    };

    return (
        <div>
            <h2>Pool Status</h2>

            <p>WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}</p>

            {loading && <p>Loading...</p>}

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {poolData ? (
                <div>
                    <p>Pool Balance: {formatWei(poolData.poolBalance)}</p>
                    <p>Total Premiums: {formatWei(poolData.totalPremiums)}</p>
                    <p>Total Claims: {formatWei(poolData.totalClaims)}</p>
                    <p>Active Policies: {poolData.activePolicies}</p>
                </div>
            ) : (
                !loading && <p>No pool data available</p>
            )}

            <Button onClick={refetch}>Refresh</Button>

            <h3>Recent Events</h3>
            {events.length === 0 ? (
                <p>No events yet</p>
            ) : (
                <ul>
                    {events.map((event, idx) => (
                        <li key={idx}>
                            {event.type}: {JSON.stringify(event)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
