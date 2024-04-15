/**
 * @note remove duplicate elements of an array
 * @param array Any array.
 */
const removeDuplicates = function (array) {
    return array.filter((c, index) => {
        return array.indexOf(c) === index;
    });
};

module.exports = {
    removeDuplicates,
};
