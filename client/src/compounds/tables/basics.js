import './style.css'

function BasicsTable(props) {
    return <table className='basics-table overflow-auto' style={{ width: "100%" }}>
        
        <thead>
            
            <tr>
                {props.sno && <th>S. No</th>}
                {
                    props.header !== undefined && props.header.map((item, i) => (
                        <th className='text-[14px]' key={i}>{item}</th>
                    ))
                }
            </tr>
        </thead>
        <tbody>
            
                {
                    props.data !== undefined && props.data.map((item, i) => (
                        <tr key={i}>
                            {props.sno && <td key={i} >{i + 1}</td>}
                            {
                                props.fields !== undefined && props.fields.map((field, j) => (
                                    <td key={j}>{item[field]}</td>
                                ))
                            }
                        </tr>
                    ))
                }
        </tbody>
    </table>
}

export default BasicsTable